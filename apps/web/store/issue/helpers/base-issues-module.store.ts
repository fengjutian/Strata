/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { clone, concat, get, pull, uniq } from "lodash-es";
import { action, makeObservable, runInAction } from "mobx";
// types
import type { TIssue } from "@strata/types";
import { EIssueServiceType } from "@strata/types";
//
import type { IIssueRootStore } from "../root.store";
import { BaseIssueCycleStore } from "./base-issues-cycle.store";
import type { IBaseIssueFilterStore } from "./issue-filter-helper.store";

/**
 * Module membership operations: adding and removing issues from a module while
 * keeping both the module list and the issue's `module_ids` in sync.
 */
export abstract class BaseIssueModuleStore extends BaseIssueCycleStore {
  constructor(
    rootStore: IIssueRootStore,
    issueFilterStore: IBaseIssueFilterStore,
    isArchived = false,
    serviceType = EIssueServiceType.ISSUES
  ) {
    super(rootStore, issueFilterStore, isArchived, serviceType);
    makeObservable(this, {
      issueQuickAdd: action.bound,
      addIssuesToModule: action.bound,
      removeIssuesFromModule: action.bound,
      changeModulesInIssue: action.bound,
    });
  }

  /**
   * Method to perform Quick add of issues.
   *
   * Lives on the top layer of the chain because it composes the cycle and module
   * membership operations defined in the layers below.
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @returns
   */
  async issueQuickAdd(workspaceSlug: string, projectId: string, data: TIssue) {
    // Add issue to store with a temporary Id
    this.addIssue(data);
    // call Create issue method
    const response = await this.createIssue(workspaceSlug, projectId, data);
    runInAction(() => {
      this.removeIssueFromList(data.id);
      this.rootIssueStore.issues.removeIssue(data.id);
    });
    const currentCycleId = data.cycle_id !== "" && data.cycle_id === "None" ? undefined : data.cycle_id;
    const currentModuleIds =
      data.module_ids && data.module_ids.length > 0 ? data.module_ids.filter((moduleId) => moduleId != "None") : [];
    const promiseRequests = [];
    if (currentCycleId) {
      promiseRequests.push(this.addCycleToIssue(workspaceSlug, projectId, currentCycleId, response.id));
    }
    if (currentModuleIds.length > 0) {
      promiseRequests.push(this.changeModulesInIssue(workspaceSlug, projectId, response.id, currentModuleIds, []));
    }
    if (promiseRequests && promiseRequests.length > 0) {
      await Promise.all(promiseRequests);
    }
    return response;
  }

  /**
   * This method is used to add issues to a module
   * @param workspaceSlug
   * @param projectId
   * @param moduleId
   * @param issueIds
   * @param fetchAddedIssues If True we make an additional call to fetch all the issues from their Ids, Since the addIssuesToModule API does not return them
   */
  async addIssuesToModule(
    workspaceSlug: string,
    projectId: string,
    moduleId: string,
    issueIds: string[],
    fetchAddedIssues = true
  ) {
    // Perform an APi call to add issue to module
    await this.moduleService.addIssuesToModule(workspaceSlug, projectId, moduleId, {
      issues: issueIds,
    });

    // if true, fetch the issue data for all the issueIds
    if (fetchAddedIssues) await this.rootIssueStore.issues.getIssues(workspaceSlug, projectId, issueIds);

    // if module Id is the current Module Id then call fetch parent stats
    if (this.moduleId === moduleId) this.fetchParentStats(workspaceSlug, projectId);

    runInAction(() => {
      // if module Id is the current Module Id, then, add issue to list of issueIds
      // oxlint-disable-next-line no-unused-expressions
      this.moduleId === moduleId && issueIds.forEach((issueId) => this.addIssueToList(issueId));
    });

    // For Each issue update module Ids by calling current store's update Issue, without making an API call
    issueIds.forEach((issueId) => {
      const issueModuleIds = get(this.rootIssueStore.issues.issuesMap, [issueId, "module_ids"]) ?? [];
      const updatedIssueModuleIds = uniq(concat(issueModuleIds, [moduleId]));
      this.issueUpdate(workspaceSlug, projectId, issueId, { module_ids: updatedIssueModuleIds }, false);
    });
  }

  /**
   * This method is used to remove issue from a module
   * @param workspaceSlug
   * @param projectId
   * @param moduleId
   * @param issueIds
   * @returns
   */
  async removeIssuesFromModule(workspaceSlug: string, projectId: string, moduleId: string, issueIds: string[]) {
    // Perform an APi call to remove issue to module
    const response = await this.moduleService.removeIssuesFromModuleBulk(workspaceSlug, projectId, moduleId, issueIds);

    // if module Id is the current Module Id then call fetch parent stats
    if (this.moduleId === moduleId) this.fetchParentStats(workspaceSlug, projectId);

    runInAction(() => {
      // if module Id is the current Module Id, then remove issue from list of issueIds
      // oxlint-disable-next-line no-unused-expressions
      this.moduleId === moduleId && issueIds.forEach((issueId) => this.removeIssueFromList(issueId));
    });

    // For Each issue update module Ids by calling current store's update Issue, without making an API call
    runInAction(() => {
      issueIds.forEach((issueId) => {
        const issueModuleIds = get(this.rootIssueStore.issues.issuesMap, [issueId, "module_ids"]) ?? [];
        const updatedIssueModuleIds = pull(issueModuleIds, moduleId);
        this.issueUpdate(workspaceSlug, projectId, issueId, { module_ids: updatedIssueModuleIds }, false);
      });
    });

    return response;
  }

  /*
   * add Modules to Array in a non optimistic way while creating issues
   * @param workspaceSlug
   * @param projectId
   * @param issueId
   * @param moduleIds array of modules to be added
   */
  async addModulesToIssue(workspaceSlug: string, projectId: string, issueId: string, moduleIds: string[]) {
    // keep a copy of the original module ids
    const originalModuleIds = get(this.rootIssueStore.issues.issuesMap, [issueId, "module_ids"]) ?? [];
    //Perform API call
    await this.moduleService.addModulesToIssue(workspaceSlug, projectId, issueId, {
      modules: moduleIds,
      removed_modules: [],
    });

    runInAction(() => {
      // get current Module Ids of the issue
      let currentModuleIds = [...originalModuleIds];

      // If current Module Id is included in the modules list, then add Issue to List
      if (moduleIds.includes(this.moduleId ?? "")) this.addIssueToList(issueId);
      currentModuleIds = uniq(concat([...currentModuleIds], moduleIds));

      // For current Issue, update module Ids by calling current store's update Issue, without making an API call
      this.issueUpdate(workspaceSlug, projectId, issueId, { module_ids: currentModuleIds }, false);
    });

    if (moduleIds.includes(this.moduleId ?? "")) {
      this.fetchParentStats(workspaceSlug, projectId, this.moduleId);
    }
  }

  /*
   * change modules array in issue
   * @param workspaceSlug
   * @param projectId
   * @param issueId
   * @param addModuleIds array of modules to be added
   * @param removeModuleIds array of modules to be removed
   */
  async changeModulesInIssue(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    addModuleIds: string[],
    removeModuleIds: string[]
  ) {
    // keep a copy of the original module ids
    const issueBeforeChanges = clone(this.rootIssueStore.issues.getIssueById(issueId));
    const originalModuleIds = get(this.rootIssueStore.issues.issuesMap, [issueId, "module_ids"]) ?? [];
    try {
      runInAction(() => {
        // get current Module Ids of the issue
        let currentModuleIds = [...originalModuleIds];
        // remove the new issue id to the module issues
        removeModuleIds.forEach((moduleId) => {
          // If module Id is equal to current module Id, them remove Issue from List
          // oxlint-disable-next-line no-unused-expressions
          this.moduleId === moduleId && this.removeIssueFromList(issueId);
          currentModuleIds = pull(currentModuleIds, moduleId);
        });

        // If current Module Id is included in the modules list, then add Issue to List
        if (addModuleIds.includes(this.moduleId ?? "")) this.addIssueToList(issueId);
        currentModuleIds = uniq(concat([...currentModuleIds], addModuleIds));

        // For current Issue, update module Ids by calling current store's update Issue, without making an API call
        this.issueUpdate(workspaceSlug, projectId, issueId, { module_ids: currentModuleIds }, false);
      });

      const issueAfterChanges = clone(this.rootIssueStore.issues.getIssueById(issueId));

      // update parent stats optimistically
      if (addModuleIds.includes(this.moduleId || "") || removeModuleIds.includes(this.moduleId || "")) {
        this.updateParentStats(issueBeforeChanges, issueAfterChanges, this.moduleId);
      }

      //Perform API call
      await this.moduleService.addModulesToIssue(workspaceSlug, projectId, issueId, {
        modules: addModuleIds,
        removed_modules: removeModuleIds,
      });

      if (addModuleIds.includes(this.moduleId || "") || removeModuleIds.includes(this.moduleId || "")) {
        this.fetchParentStats(workspaceSlug, projectId);
      }
    } catch (error) {
      // revert the issue back to its original module ids
      runInAction(() => {
        // If current Module Id is included in the add modules list, then remove Issue from List
        if (addModuleIds.includes(this.moduleId ?? "")) this.removeIssueFromList(issueId);
        // If current Module Id is included in the removed modules list, then add Issue to List
        if (removeModuleIds.includes(this.moduleId ?? "")) this.addIssueToList(issueId);

        // For current Issue, update module Ids by calling current store's update Issue, without making an API call
        this.issueUpdate(workspaceSlug, projectId, issueId, { module_ids: originalModuleIds }, false);
      });

      throw error;
    }
  }
}
