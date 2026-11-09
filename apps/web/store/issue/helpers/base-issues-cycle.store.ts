/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { clone } from "lodash-es";
import { action, makeObservable, runInAction } from "mobx";
// types
import type { TIssue } from "@strata/types";
import { EIssueServiceType } from "@strata/types";
//
import type { IIssueRootStore } from "../root.store";
import { BaseIssueCrudStore } from "./base-issues-crud.store";
import type { IBaseIssueFilterStore } from "./issue-filter-helper.store";

/**
 * Cycle membership operations: adding and removing issues from a cycle while
 * keeping both the cycle list and the issue's `cycle_id` in sync.
 */
export abstract class BaseIssueCycleStore extends BaseIssueCrudStore {
  constructor(
    rootStore: IIssueRootStore,
    issueFilterStore: IBaseIssueFilterStore,
    isArchived = false,
    serviceType = EIssueServiceType.ISSUES
  ) {
    super(rootStore, issueFilterStore, isArchived, serviceType);
    makeObservable(this, {
      addIssueToCycle: action.bound,
      removeIssueFromCycle: action.bound,
      addCycleToIssue: action.bound,
      removeCycleFromIssue: action.bound,
    });
  }

  /**
   * This method is used to add issues to a particular Cycle
   * @param workspaceSlug
   * @param projectId
   * @param cycleId
   * @param issueIds
   * @param fetchAddedIssues If True we make an additional call to fetch all the issues from their Ids, Since the addIssueToCycle API does not return them
   */
  async addIssueToCycle(
    workspaceSlug: string,
    projectId: string,
    cycleId: string,
    issueIds: string[],
    fetchAddedIssues = true
  ) {
    // Perform an APi call to add issue to cycle
    await this.issueService.addIssueToCycle(workspaceSlug, projectId, cycleId, {
      issues: issueIds,
    });

    // if cycle Id is the current Cycle Id then call fetch parent stats
    if (this.cycleId === cycleId) this.fetchParentStats(workspaceSlug, projectId);

    // if true, fetch the issue data for all the issueIds
    if (fetchAddedIssues) await this.rootIssueStore.issues.getIssues(workspaceSlug, projectId, issueIds);

    // Update issueIds from current store
    runInAction(() => {
      // If cycle Id is the current cycle Id, then, add issue to list of issueIds
      if (this.cycleId === cycleId) issueIds.forEach((issueId) => this.addIssueToList(issueId));
      // If cycle Id is not the current cycle Id, then, remove issue to list of issueIds
      else if (this.cycleId) issueIds.forEach((issueId) => this.removeIssueFromList(issueId));
    });

    // For Each issue update cycle Id by calling current store's update Issue, without making an API call
    issueIds.forEach((issueId) => {
      this.issueUpdate(workspaceSlug, projectId, issueId, { cycle_id: cycleId }, false);
    });
  }

  /**
   * This method is used to remove issue from a cycle
   * @param workspaceSlug
   * @param projectId
   * @param cycleId
   * @param issueId
   */
  async removeIssueFromCycle(workspaceSlug: string, projectId: string, cycleId: string, issueId: string) {
    const issueBeforeRemoval = clone(this.rootIssueStore.issues.getIssueById(issueId));

    // update parent stats optimistically
    if (this.cycleId === cycleId) this.updateParentStats(issueBeforeRemoval, undefined, cycleId);

    // Perform an APi call to remove issue from cycle
    await this.issueService.removeIssueFromCycle(workspaceSlug, projectId, cycleId, issueId);

    // if cycle Id is the current Cycle Id then call fetch parent stats
    if (this.cycleId === cycleId) this.fetchParentStats(workspaceSlug, projectId, cycleId);

    runInAction(() => {
      // If cycle Id is the current cycle Id, then, remove issue from list of issueIds
      // oxlint-disable-next-line no-unused-expressions
      this.cycleId === cycleId && this.removeIssueFromList(issueId);
    });

    // update Issue cycle Id to null by calling current store's update Issue, without making an API call
    this.issueUpdate(workspaceSlug, projectId, issueId, { cycle_id: null }, false);
  }

  /**
   * Adds cycle to issue optimistically
   * @param workspaceSlug
   * @param projectId
   * @param cycleId
   * @param issueId
   * @returns
   */
  addCycleToIssue = async (workspaceSlug: string, projectId: string, cycleId: string, issueId: string) => {
    const issueCycleId = this.rootIssueStore.issues.getIssueById(issueId)?.cycle_id;

    if (issueCycleId === cycleId) return;

    const issueBeforeUpdate = clone(this.rootIssueStore.issues.getIssueById(issueId));

    try {
      // Update issueIds from current store
      runInAction(() => {
        // If cycle Id before update is the same as current cycle Id then, remove issueId from list
        if (this.cycleId === issueCycleId) this.removeIssueFromList(issueId);
        // If cycle Id is the current cycle Id, then, add issue to list of issueIds
        if (this.cycleId === cycleId) this.addIssueToList(issueId);
        // For Each issue update cycle Id by calling current store's update Issue, without making an API call
        this.issueUpdate(workspaceSlug, projectId, issueId, { cycle_id: cycleId }, false);
      });

      const issueAfterUpdate = clone(this.rootIssueStore.issues.getIssueById(issueId));

      // update parent stats optimistically
      if (this.cycleId === cycleId || this.cycleId === issueCycleId)
        this.updateParentStats(issueBeforeUpdate, issueAfterUpdate, this.cycleId);

      await this.issueService.addIssueToCycle(workspaceSlug, projectId, cycleId, {
        issues: [issueId],
      });

      // if cycle Id is the current Cycle Id then call fetch parent stats
      if (this.cycleId === cycleId || this.cycleId === issueCycleId)
        this.fetchParentStats(workspaceSlug, projectId, this.cycleId);
    } catch (error) {
      // remove the new issue ids from the cycle issues map
      runInAction(() => {
        // If cycle Id is the current cycle Id, then, remove issue to list of issueIds
        if (this.cycleId === cycleId) this.removeIssueFromList(issueId);
        // For Each issue update cycle Id to previous value by calling current store's update Issue, without making an API call
        this.issueUpdate(workspaceSlug, projectId, issueId, { cycle_id: issueCycleId }, false);
      });

      throw error;
    }
  };

  /*
   * Remove a cycle from issue
   * @param workspaceSlug
   * @param projectId
   * @param issueId
   * @returns
   */
  removeCycleFromIssue = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const issueBeforeRemoval = clone(this.rootIssueStore.issues.getIssueById(issueId));
    const issueCycleId = this.rootIssueStore.issues.getIssueById(issueId)?.cycle_id;
    if (!issueCycleId) return;
    try {
      // perform optimistic update, update store
      // Update issueIds from current store
      runInAction(() => {
        // If cycle Id is the current cycle Id, then, add issue to list of issueIds
        if (this.cycleId === issueCycleId) this.removeIssueFromList(issueId);
        // For Each issue update cycle Id by calling current store's update Issue, without making an API call
        this.issueUpdate(workspaceSlug, projectId, issueId, { cycle_id: null }, false);
      });

      // update parent stats optimistically
      if (this.cycleId === issueCycleId) this.updateParentStats(issueBeforeRemoval, undefined, issueCycleId);

      // make API call
      await this.issueService.removeIssueFromCycle(workspaceSlug, projectId, issueCycleId, issueId);

      // if cycle Id is the current Cycle Id then call fetch parent stats
      if (this.cycleId === issueCycleId) this.fetchParentStats(workspaceSlug, projectId, issueCycleId);
    } catch (error) {
      // revert back changes if fails
      // Update issueIds from current store
      runInAction(() => {
        // If cycle Id is the current cycle Id, then, add issue to list of issueIds
        if (this.cycleId === issueCycleId) this.addIssueToList(issueId);
        // For Each issue update cycle Id by calling current store's update Issue, without making an API call
        this.issueUpdate(workspaceSlug, projectId, issueId, { cycle_id: issueCycleId }, false);
      });

      throw error;
    }
  };
}
