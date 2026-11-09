/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { concat, get, isEmpty, isEqual, pull, set, uniq, update } from "lodash-es";
import { action, makeObservable, runInAction } from "mobx";
// strata constants
import { ALL_ISSUES } from "@strata/constants";
// types
import type { IssuePaginationOptions, TIssue, TIssueGroupByOptions, TIssuesResponse } from "@strata/types";
import { EIssueServiceType } from "@strata/types";
//
import type { IIssueRootStore } from "../root.store";
import { BaseIssueResponseStore } from "./base-issues-response.store";
import { EIssueGroupedAction } from "./base-issues.types";
import { getDifference, getGroupIssueKeyActions, getGroupKey, getSubGroupIssueKeyActions } from "./base-issues-utils";
import type { IBaseIssueFilterStore } from "./issue-filter-helper.store";

/**
 * Keeps the grouped issue id lists (and their counts) in sync when a single
 * issue changes, without re-fetching.
 *
 * This layer owns everything about *where an issue id lives* inside
 * `groupedIssueIds` for incremental updates; it does not perform any API call
 * of its own.
 */
export abstract class BaseIssueGroupingStore extends BaseIssueResponseStore {
  // Abstract class to be implemented to fetch parent stats such as project, module or cycle details
  abstract fetchParentStats: (workspaceSlug: string, projectId?: string, id?: string) => void;

  abstract updateParentStats: (prevIssueState?: TIssue, nextIssueState?: TIssue, id?: string) => void;

  constructor(
    rootStore: IIssueRootStore,
    issueFilterStore: IBaseIssueFilterStore,
    isArchived = false,
    serviceType = EIssueServiceType.ISSUES
  ) {
    super(rootStore, issueFilterStore, isArchived, serviceType);
    makeObservable(this, {
      onfetchIssues: action.bound,
      onfetchNexIssues: action.bound,
      addIssue: action.bound,
      removeIssueFromList: action.bound,
    });
  }

  /**
   * This Method is called after fetching the first paginated issues
   *
   * This method updates the appropriate issue list based on if groupByKey or subGroupByKey are defined
   * If both groupByKey and subGroupByKey are not defined, then the issue list are added to another group called ALL_ISSUES
   * @param issuesResponse  Paginated Response received from the API
   * @param options Pagination options
   * @param workspaceSlug
   * @param projectId
   * @param id Id can be anything from cycleId, moduleId, viewId or userId based on the store
   */
  onfetchIssues(
    issuesResponse: TIssuesResponse,
    options: IssuePaginationOptions,
    workspaceSlug: string,
    projectId?: string,
    id?: string,
    shouldClearPaginationOptions = true
  ) {
    // Process the Issue Response to get the following data from it
    const { issueList, groupedIssues, groupedIssueCount } = this.processIssueResponse(issuesResponse);

    // The Issue list is added to the main Issue Map
    this.rootIssueStore.issues.addIssue(issueList);

    // Update all the GroupIds to this Store's groupedIssueIds and update Individual group issue counts
    runInAction(() => {
      this.clear(shouldClearPaginationOptions);
      this.updateGroupedIssueIds(groupedIssues, groupedIssueCount);
      this.loader[getGroupKey()] = undefined;
    });

    // fetch parent stats if required, to be handled in the Implemented class
    this.fetchParentStats(workspaceSlug, projectId, id);

    this.rootIssueStore.issueDetail.relation.extractRelationsFromIssues(issueList);

    // store Pagination options for next subsequent calls and data like next cursor etc
    this.storePreviousPaginationValues(issuesResponse, options);
  }

  /**
   * This Method is called on the subsequent pagination calls after the first initial call
   *
   * This method updates the appropriate issue list based on if groupId or subgroupIds are Passed
   * @param issuesResponse Paginated Response received from the API
   * @param groupId
   * @param subGroupId
   */
  onfetchNexIssues(issuesResponse: TIssuesResponse, groupId?: string, subGroupId?: string) {
    // Process the Issue Response to get the following data from it
    const { issueList, groupedIssues, groupedIssueCount } = this.processIssueResponse(issuesResponse);

    // The Issue list is added to the main Issue Map
    this.rootIssueStore.issues.addIssue(issueList);

    // Update all the GroupIds to this Store's groupedIssueIds and update Individual group issue counts
    runInAction(() => {
      this.updateGroupedIssueIds(groupedIssues, groupedIssueCount, groupId, subGroupId);
      this.loader[getGroupKey(groupId, subGroupId)] = undefined;
    });

    this.rootIssueStore.issueDetail.relation.extractRelationsFromIssues(issueList);

    // store Pagination data like next cursor etc
    this.storePreviousPaginationValues(issuesResponse, undefined, groupId, subGroupId);
  }

  /**
   * Add issue to the store
   * @param issue
   * @param shouldUpdateList indicates if the issue Id to be added to the list
   */
  addIssue(issue: TIssue, shouldUpdateList = true) {
    runInAction(() => {
      this.rootIssueStore.issues.addIssue([issue]);
    });

    // if true, add issue id to the list
    if (shouldUpdateList) this.updateIssueList(issue, undefined, EIssueGroupedAction.ADD);
  }

  /**
   * Method called to add issue id to list.
   * This will only work if the issue already exists in the main issue map
   * @param issueId
   */
  addIssueToList(issueId: string) {
    const issue = this.rootIssueStore.issues.getIssueById(issueId);
    this.updateIssueList(issue, undefined, EIssueGroupedAction.ADD);
  }

  /**
   * Method called to remove issue id from list.
   * This will only work if the issue already exists in the main issue map
   * @param issueId
   */
  removeIssueFromList(issueId: string) {
    const issue = this.rootIssueStore.issues.getIssueById(issueId);
    this.updateIssueList(undefined, issue, EIssueGroupedAction.DELETE);
  }

  /**
   * Method called to update the issue list,
   * If an action is passed, this method would add/remove the issue from list according to the action
   * If there is no action, this method compares before and after states of the issue to decide, where to remove the issue id from and where to add it to
   * if only issue is passed down then, the method determines where to add the issue Id and updates the list
   * @param issue current issue state
   * @param issueBeforeUpdate issue state before the update
   * @param action specific action can be provided to force the method to that action
   * @returns
   */
  updateIssueList(
    issue?: TIssue,
    issueBeforeUpdate?: TIssue,
    // oxlint-disable-next-line no-shadow
    action?: EIssueGroupedAction.ADD | EIssueGroupedAction.DELETE
  ) {
    if (!issue && !issueBeforeUpdate) return;

    // get Issue ID from one of the issue objects
    const issueId = issue?.id ?? issueBeforeUpdate?.id;
    if (!issueId) return;

    // Get display filters to check if 'Show sub Work items' is enabled - Do not add Work item to main list if disabled.
    const isShowWorkItemsEnabled = this.issueFilterStore.issueFilters?.displayFilters?.sub_issue ?? false;

    // get issueUpdates from another method by passing down the three arguments
    // issueUpdates is nothing but an array of objects that contain the path of the issueId list that need updating and also the action that needs to be performed at the path
    const issueUpdates = this.getUpdateDetails(issue, issueBeforeUpdate, action);
    const accumulatedUpdatesForCount = {};
    runInAction(() => {
      // The issueUpdates
      for (const issueUpdate of issueUpdates) {
        //if update is add, add it at a particular path
        if (issueUpdate.action === EIssueGroupedAction.ADD) {
          const isSubIssue = issue?.parent_id;
          if (isSubIssue && !isShowWorkItemsEnabled) continue;
          // add issue Id at the path
          update(this, ["groupedIssueIds", ...issueUpdate.path], (issueIds: string[] = []) =>
            this.issuesSortWithOrderBy(uniq(concat(issueIds, issueId)), this.orderBy)
          );
        }

        //if update is delete, remove it at a particular path
        if (issueUpdate.action === EIssueGroupedAction.DELETE) {
          // remove issue Id from the path
          update(this, ["groupedIssueIds", ...issueUpdate.path], (issueIds: string[] = []) => pull(issueIds, issueId));
        }

        // accumulate the updates so that we don't end up updating the count twice for the same issue
        this.accumulateIssueUpdates(accumulatedUpdatesForCount, issueUpdate.path, issueUpdate.action);

        //if update is reorder, reorder it at a particular path
        if (issueUpdate.action === EIssueGroupedAction.REORDER) {
          // re-order/re-sort the issue Ids at the path
          update(this, ["groupedIssueIds", ...issueUpdate.path], (issueIds: string[] = []) =>
            this.issuesSortWithOrderBy(issueIds, this.orderBy)
          );
        }
      }

      // update the respective counts from the accumulation object
      this.updateIssueCount(accumulatedUpdatesForCount);
    });
  }

  /**
   * For Every issue update, accumulate it so that when an single issue is added to two groups, it doesn't increment the total count twice
   * @param accumulator
   * @param path
   * @param action
   * @returns
   */
  accumulateIssueUpdates(
    accumulator: { [key: string]: EIssueGroupedAction },
    path: string[],
    // oxlint-disable-next-line no-shadow
    action: EIssueGroupedAction
  ) {
    const [groupId, subGroupId] = path;

    if (action !== EIssueGroupedAction.ADD && action !== EIssueGroupedAction.DELETE) return;

    // if both groupId && subGroupId exists update the subgroup key
    if (subGroupId && groupId) {
      const groupKey = getGroupKey(groupId, subGroupId);
      this.updateUpdateAccumulator(accumulator, groupKey, action);
    }

    // after above, if groupId exists update the group key
    if (groupId) {
      this.updateUpdateAccumulator(accumulator, groupId, action);
    }

    // if groupId is not ALL_ISSUES then update the  All_ISSUES key
    // (if groupId is equal to ALL_ISSUES, it would have updated in the previous condition)
    if (groupId !== ALL_ISSUES) {
      this.updateUpdateAccumulator(accumulator, ALL_ISSUES, action);
    }
  }

  /**
   * This method's job is just to check and update the accumulator key
   * @param accumulator accumulator object
   * @param key object key like, subgroupKey, Group Key or ALL_ISSUES
   * @param action
   * @returns
   */
  updateUpdateAccumulator(
    accumulator: { [key: string]: EIssueGroupedAction },
    key: string,
    // oxlint-disable-next-line no-shadow
    action: EIssueGroupedAction
  ) {
    // if the key for accumulator is undefined, they update it with the action
    if (!accumulator[key]) {
      accumulator[key] = action;
      return;
    }

    // if the key for accumulator is not the current action,
    // Meaning if the key already has an action ADD and the current one is REMOVE,
    // The key is deleted as both the actions cancel each other out
    if (accumulator[key] !== action) {
      delete accumulator[key];
    }
  }

  /**
   * This method is used to update the count of the issues at the path with the increment
   * @param path issuePath, corresponding key is to be incremented
   * @param increment
   */
  updateIssueCount(accumulatedUpdatesForCount: { [key: string]: EIssueGroupedAction }) {
    const updateKeys = Object.keys(accumulatedUpdatesForCount);
    for (const updateKey of updateKeys) {
      // oxlint-disable-next-line no-shadow
      const update = accumulatedUpdatesForCount[updateKey];
      if (!update) continue;

      const increment = update === EIssueGroupedAction.ADD ? 1 : -1;
      // get current count at the key
      const issueCount = get(this.groupedIssueCount, updateKey) ?? 0;
      // update the count at the key
      set(this.groupedIssueCount, updateKey, issueCount + increment);
    }
  }

  /**
   * This method is used to get update Details that would be used to update the issue Ids at the path
   * @param issue current state of issue
   * @param issueBeforeUpdate state of the issue before the update
   * @param action optional action, to force the method to return back that action
   * @returns an array of object that contains the path at which issue to be updated and the action to be performed at the path
   */
  getUpdateDetails = (
    issue?: Partial<TIssue>,
    issueBeforeUpdate?: Partial<TIssue>,
    // oxlint-disable-next-line no-shadow
    action?: EIssueGroupedAction.ADD | EIssueGroupedAction.DELETE
  ): { path: string[]; action: EIssueGroupedAction }[] => {
    // check the before and after states to return if there needs to be a re-sorting of issueId list if the issue property that orderBy  depends on has changed
    const orderByUpdates = this.getOrderByUpdateDetails(issue, issueBeforeUpdate);
    // if unGrouped, then return the path as ALL_ISSUES along with orderByUpdates
    if (!this.issueGroupKey) return action ? [{ path: [ALL_ISSUES], action }, ...orderByUpdates] : orderByUpdates;

    const issueGroupKeyValue = issue?.[this.issueGroupKey] as string | string[] | null | undefined;
    const issueBeforeUpdateGroupKey = issueBeforeUpdate?.[this.issueGroupKey] as string | string[] | null | undefined;
    // if grouped, the get the Difference between the two issue properties (this.issueGroupKey) on which groupBy is performed
    const groupActionsArray = getDifference(
      this.getArrayStringArray(issue, issueGroupKeyValue, this.groupBy),
      this.getArrayStringArray(issueBeforeUpdate, issueBeforeUpdateGroupKey, this.groupBy),
      action
    );

    // if not subGrouped, then use the differences to construct an updateDetails Array
    if (!this.issueSubGroupKey)
      return [
        ...getGroupIssueKeyActions(
          groupActionsArray[EIssueGroupedAction.ADD],
          groupActionsArray[EIssueGroupedAction.DELETE]
        ),
        ...orderByUpdates,
      ];

    const issueSubGroupKey = issue?.[this.issueSubGroupKey] as string | string[] | null | undefined;
    const issueBeforeUpdateSubGroupKey = issueBeforeUpdate?.[this.issueSubGroupKey] as
      | string
      | string[]
      | null
      | undefined;
    // if subGrouped, the get the Difference between the two issue properties (this.issueGroupKey) on which subGroupBy is performed
    const subGroupActionsArray = getDifference(
      this.getArrayStringArray(issue, issueSubGroupKey, this.subGroupBy),
      this.getArrayStringArray(issueBeforeUpdate, issueBeforeUpdateSubGroupKey, this.subGroupBy),
      action
    );

    // Use the differences to construct an updateDetails Array
    return [
      ...getSubGroupIssueKeyActions(
        groupActionsArray,
        subGroupActionsArray,
        this.getArrayStringArray(issueBeforeUpdate, issueBeforeUpdateGroupKey, this.groupBy),
        this.getArrayStringArray(issue, issueGroupKeyValue, this.groupBy),
        this.getArrayStringArray(issueBeforeUpdate, issueBeforeUpdateSubGroupKey, this.subGroupBy),
        this.getArrayStringArray(issue, issueSubGroupKey, this.subGroupBy)
      ),
      ...orderByUpdates,
    ];
  };

  /**
   * This method is used to get update Details that would be used to re-order/re-sort the issue Ids at the path
   * @param issue current state of issue
   * @param issueBeforeUpdate state of the issue before the update
   * @returns  an array of object that contains the path at which issue to be re-sorted/re-ordered
   */
  getOrderByUpdateDetails(
    issue: Partial<TIssue> | undefined,
    issueBeforeUpdate: Partial<TIssue> | undefined
  ): { path: string[]; action: EIssueGroupedAction.REORDER }[] {
    // if before and after states of the issue prop on which orderBy depends on then return and empty Array
    if (
      !issue ||
      !issueBeforeUpdate ||
      !this.orderByKey ||
      isEqual(issue[this.orderByKey], issueBeforeUpdate[this.orderByKey])
    )
      return [];

    // if they are not equal and issues are not grouped then, provide path as ALL_ISSUES
    if (!this.issueGroupKey) return [{ path: [ALL_ISSUES], action: EIssueGroupedAction.REORDER }];

    const issueGroupKey = issue?.[this.issueGroupKey] as string | string[] | null | undefined;
    // if they are grouped then identify the paths based on props on which group by is dependent on
    const issueKeyActions: { path: string[]; action: EIssueGroupedAction.REORDER }[] = [];
    const groupByValues = this.getArrayStringArray(issue, issueGroupKey);

    // if issues are not subGrouped then, provide path from groupByValues
    if (!this.issueSubGroupKey) {
      for (const groupKey of groupByValues) {
        issueKeyActions.push({ path: [groupKey], action: EIssueGroupedAction.REORDER });
      }

      return issueKeyActions;
    }

    const issueSubGroupKey = issue?.[this.issueSubGroupKey] as string | string[] | null | undefined;
    // if they are grouped then identify the paths based on props on which sub group by is dependent on
    const subGroupByValues = this.getArrayStringArray(issue, issueSubGroupKey);

    // if issues are subGrouped then, provide path from subGroupByValues
    for (const groupKey of groupByValues) {
      for (const subGroupKey of subGroupByValues) {
        issueKeyActions.push({ path: [groupKey, subGroupKey], action: EIssueGroupedAction.REORDER });
      }
    }

    return issueKeyActions;
  }

  // /**
  //  * Normalizes group values into a consistent string array format
  //  * @param issueObject - The issue object to extract values from
  //  * @param value - The raw value (string, array, or null/undefined)
  //  * @param groupByKey - The group by key to handle special cases
  //  * @returns Normalized array of string values
  //  */
  getArrayStringArray = (
    issueObject: Partial<TIssue> | undefined,
    value: string | string[] | undefined | null,
    groupByKey?: TIssueGroupByOptions
  ): string[] => {
    // if issue object is undefined return empty array
    if (!issueObject) return [];
    // if value is not defined, return None value in array
    if (!value || isEmpty(value)) return ["None"];
    // if array return the array
    if (Array.isArray(value)) return value;

    return this.getDefaultGroupValue(issueObject, value, groupByKey);
  };

  // /**
  //  * Gets the default value for a group when the primary value is empty
  //  * @param issueObject - The issue object to extract fallback values from
  //  * @param groupByKey - The group by key to determine fallback logic
  //  * @returns Default group value as string array
  //  */
  private getDefaultGroupValue = (
    issueObject: Partial<TIssue>,
    value: string,
    groupByKey?: TIssueGroupByOptions
  ): string[] => {
    // Handle special case for state group
    if (groupByKey === "state_detail.group") {
      return [this.rootIssueStore.rootStore.state.stateMap?.[value]?.group ?? issueObject.state__group];
    }

    return [value];
  };
}
