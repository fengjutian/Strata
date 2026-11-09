/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { clone, uniq } from "lodash-es";
import { action, makeObservable, runInAction } from "mobx";
// types
import type { IBlockUpdateDependencyData, TBulkOperationsPayload, TIssue } from "@strata/types";
import { EIssueServiceType } from "@strata/types";
//
import type { IIssueRootStore } from "../root.store";
import { BaseIssueGroupingStore } from "./base-issues-grouping.store";
import type { IBaseIssueFilterStore } from "./issue-filter-helper.store";

/**
 * Create/update/delete/archive operations on issues.
 *
 * Every mutation here performs the API call through the services owned by the
 * pagination layer and keeps the grouped lists in sync via the grouping layer.
 */
export abstract class BaseIssueCrudStore extends BaseIssueGroupingStore {
  constructor(
    rootStore: IIssueRootStore,
    issueFilterStore: IBaseIssueFilterStore,
    isArchived = false,
    serviceType = EIssueServiceType.ISSUES
  ) {
    super(rootStore, issueFilterStore, isArchived, serviceType);
    makeObservable(this, {
      createIssue: action,
      issueUpdate: action,
      updateIssueDates: action,
      removeIssue: action.bound,
      issueArchive: action.bound,
      removeBulkIssues: action.bound,
      bulkArchiveIssues: action.bound,
      bulkUpdateProperties: action.bound,
    });
  }

  /**
   * Method to create Issue. This method updates the store and calls the API to create an issue
   * @param workspaceSlug
   * @param projectId
   * @param data Default Issue Data
   * @param id optional id like moduleId and cycleId, not used here but required in overridden the Module or cycle issues methods
   * @param shouldUpdateList If false, then it would not update the Issue Id list but only makes an API call and adds to the main Issue Map
   * @returns
   */
  async createIssue(
    workspaceSlug: string,
    projectId: string,
    data: Partial<TIssue>,
    id?: string,
    shouldUpdateList = true
  ) {
    // perform an API call
    const response = await this.issueService.createIssue(workspaceSlug, projectId, data);

    // add Issue to Store
    this.addIssue(response, shouldUpdateList);

    // If shouldUpdateList is true, call fetchParentStats
    // oxlint-disable-next-line no-unused-expressions
    shouldUpdateList && (await this.fetchParentStats(workspaceSlug, projectId));

    return response;
  }

  /**
   * Updates the Issue, by calling the API and also updating the store
   * @param workspaceSlug
   * @param projectId
   * @param issueId
   * @param data Partial Issue Data to be updated
   * @param shouldSync If False then only issue is to be updated in the store not call API to update
   * @returns
   */
  async issueUpdate(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssue>,
    shouldSync = true
  ) {
    // Store Before state of the issue
    const issueBeforeUpdate = clone(this.rootIssueStore.issues.getIssueById(issueId));
    try {
      // Update the Respective Stores
      this.rootIssueStore.issues.updateIssue(issueId, data);
      this.updateIssueList({ ...issueBeforeUpdate, ...data } as TIssue, issueBeforeUpdate);

      // Check if should Sync
      if (!shouldSync) return;

      // update parent stats optimistically
      this.updateParentStats(issueBeforeUpdate, {
        ...issueBeforeUpdate,
        ...data,
      } as TIssue);

      // call API to update the issue
      await this.issueService.patchIssue(workspaceSlug, projectId, issueId, data);

      // call fetch Parent Stats
      this.fetchParentStats(workspaceSlug, projectId);
    } catch (error) {
      // If errored out update store again to revert the change
      this.rootIssueStore.issues.updateIssue(issueId, issueBeforeUpdate ?? {});
      this.updateIssueList(issueBeforeUpdate, { ...issueBeforeUpdate, ...data } as TIssue);
      throw error;
    }
  }

  /**
   * This method is called to delete an issue
   * @param workspaceSlug
   * @param projectId
   * @param issueId
   */
  async removeIssue(workspaceSlug: string, projectId: string, issueId: string) {
    // Store Before state of the issue
    const issueBeforeRemoval = clone(this.rootIssueStore.issues.getIssueById(issueId));
    // update parent stats optimistically
    this.updateParentStats(issueBeforeRemoval, undefined);

    // Male API call
    await this.issueService.deleteIssue(workspaceSlug, projectId, issueId);
    // Remove from Respective issue Id list
    runInAction(() => {
      this.removeIssueFromList(issueId);
    });
    // call fetch Parent stats
    this.fetchParentStats(workspaceSlug, projectId);
    // Remove issue from main issue Map store
    this.rootIssueStore.issues.removeIssue(issueId);
  }

  /**
   * This method is called to Archive an issue
   * @param workspaceSlug
   * @param projectId
   * @param issueId
   */
  async issueArchive(workspaceSlug: string, projectId: string, issueId: string) {
    const issueBeforeArchive = clone(this.rootIssueStore.issues.getIssueById(issueId));
    // update parent stats optimistically
    this.updateParentStats(issueBeforeArchive, undefined);
    // Male API call
    const response = await this.issueArchiveService.archiveIssue(workspaceSlug, projectId, issueId);
    // call fetch Parent stats
    this.fetchParentStats(workspaceSlug, projectId);
    runInAction(() => {
      // Update the Archived at of the issue from store
      this.rootIssueStore.issues.updateIssue(issueId, {
        archived_at: response.archived_at,
      });
      // Since Archived remove the issue Id from the current store
      this.removeIssueFromList(issueId);
    });
  }

  /**
   * This is a method to delete issues in bulk
   * @param workspaceSlug
   * @param projectId
   * @param issueIds
   * @returns
   */
  async removeBulkIssues(workspaceSlug: string, projectId: string, issueIds: string[]) {
    // Make API call to bulk delete issues
    const response = await this.issueService.bulkDeleteIssues(workspaceSlug, projectId, { issue_ids: issueIds });
    // call fetch parent stats
    this.fetchParentStats(workspaceSlug, projectId);
    // Remove issues from the store
    runInAction(() => {
      issueIds.forEach((issueId) => {
        this.removeIssueFromList(issueId);
        this.rootIssueStore.issues.removeIssue(issueId);
      });
    });
    return response;
  }

  /**
   * Bulk Archive issues
   * @param workspaceSlug
   * @param projectId
   * @param issueIds
   */
  bulkArchiveIssues = async (workspaceSlug: string, projectId: string, issueIds: string[]) => {
    const response = await this.issueService.bulkArchiveIssues(workspaceSlug, projectId, { issue_ids: issueIds });

    runInAction(() => {
      issueIds.forEach((issueId) => {
        this.issueUpdate(
          workspaceSlug,
          projectId,
          issueId,
          {
            archived_at: response.archived_at,
          },
          false
        );
        this.removeIssueFromList(issueId);
      });
    });
  };

  /**
   * @description bulk update properties of selected issues
   * @param {TBulkOperationsPayload} data
   */
  bulkUpdateProperties = async (workspaceSlug: string, projectId: string, data: TBulkOperationsPayload) => {
    const issueIds = data.issue_ids;
    // make request to update issue properties
    await this.issueService.bulkOperations(workspaceSlug, projectId, data);
    // update issues in the store
    runInAction(() => {
      issueIds.forEach((issueId) => {
        const issueBeforeUpdate = clone(this.rootIssueStore.issues.getIssueById(issueId));
        if (!issueBeforeUpdate) throw new Error("Work item not found");
        Object.keys(data.properties).forEach((key) => {
          const property = key as keyof TBulkOperationsPayload["properties"];
          const propertyValue = data.properties[property];
          // update root issue map properties
          if (Array.isArray(propertyValue)) {
            // if property value is array, append it to the existing values
            const existingValue = issueBeforeUpdate[property];
            // convert existing value to an array
            const newExistingValue = Array.isArray(existingValue) ? existingValue : [];
            this.rootIssueStore.issues.updateIssue(issueId, {
              [property]: uniq([...newExistingValue, ...propertyValue]),
            });
          } else {
            // if property value is not an array, simply update the value
            this.rootIssueStore.issues.updateIssue(issueId, {
              [property]: propertyValue,
            });
          }
        });
        const issueDetails = this.rootIssueStore.issues.getIssueById(issueId);
        this.updateIssueList(issueDetails, issueBeforeUpdate);
      });
    });
  };

  async updateIssueDates(workspaceSlug: string, updates: IBlockUpdateDependencyData[], projectId?: string) {
    if (!projectId) return;
    const issueDatesBeforeChange: { id: string; start_date?: string; target_date?: string }[] = [];
    try {
      const getIssueById = this.rootIssueStore.issues.getIssueById;
      runInAction(() => {
        // oxlint-disable-next-line no-shadow
        for (const update of updates) {
          const dates: Partial<TIssue> = {};
          if (update.start_date) dates.start_date = update.start_date;
          if (update.target_date) dates.target_date = update.target_date;

          const currIssue = getIssueById(update.id);

          if (currIssue) {
            issueDatesBeforeChange.push({
              id: update.id,
              start_date: currIssue.start_date ?? undefined,
              target_date: currIssue.target_date ?? undefined,
            });
          }

          this.issueUpdate(workspaceSlug, projectId, update.id, dates, false);
        }
      });

      await this.issueService.updateIssueDates(workspaceSlug, projectId, updates);
    } catch (e) {
      runInAction(() => {
        // oxlint-disable-next-line no-shadow
        for (const update of issueDatesBeforeChange) {
          const dates: Partial<TIssue> = {};
          if (update.start_date) dates.start_date = update.start_date;
          if (update.target_date) dates.target_date = update.target_date;

          this.issueUpdate(workspaceSlug, projectId, update.id, dates, false);
        }
      });
      console.error("error while updating Timeline dependencies");
      throw e;
    }
  }
}
