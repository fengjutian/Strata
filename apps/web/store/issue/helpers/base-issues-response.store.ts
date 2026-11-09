/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { concat, set, uniq, update } from "lodash-es";
// strata constants
import { ALL_ISSUES } from "@strata/constants";
// types
import type {
  TGroupedIssueCount,
  TGroupedIssues,
  TIssue,
  TIssues,
  TIssuesResponse,
  TSubGroupedIssues,
} from "@strata/types";
//
import { BaseIssueSortingStore } from "./base-issues-sorting.store";
import { getGroupKey } from "./base-issues-utils";

/**
 * Translates a paginated issues response into the grouped issue id lists that
 * the store keeps in `groupedIssueIds` / `groupedIssueCount`.
 *
 * Pure projection: no API call, no reactivity side effects beyond the store
 * mutations performed by the caller's `runInAction`.
 */
export abstract class BaseIssueResponseStore extends BaseIssueSortingStore {
  /**
   * This method processes the issueResponse to provide data that can be used to update the store
   * @param issueResponse
   * @returns  issueList, list of issue Data
   * @returns groupedIssues, grouped issue Ids
   * @returns groupedIssueCount, object containing issue counts of individual groups
   */
  processIssueResponse(issueResponse: TIssuesResponse): {
    issueList: TIssue[];
    groupedIssues: TIssues;
    groupedIssueCount: TGroupedIssueCount;
  } {
    const issueResult = issueResponse?.results;

    // if undefined return empty objects
    if (!issueResult)
      return {
        issueList: [],
        groupedIssues: {},
        groupedIssueCount: {},
      };

    //if is an array then it's an ungrouped response. return values with groupId as ALL_ISSUES
    if (Array.isArray(issueResult)) {
      return {
        issueList: issueResult,
        groupedIssues: {
          [ALL_ISSUES]: issueResult.map((issue) => issue.id),
        },
        groupedIssueCount: {
          [ALL_ISSUES]: issueResponse.total_count,
        },
      };
    }

    const issueList: TIssue[] = [];
    const groupedIssues: TGroupedIssues | TSubGroupedIssues = {};
    const groupedIssueCount: TGroupedIssueCount = {};

    // update total issue count to ALL_ISSUES
    set(groupedIssueCount, [ALL_ISSUES], issueResponse.total_count);

    // loop through all the groupIds from issue Result
    for (const groupId in issueResult) {
      const groupIssuesObject = issueResult[groupId];
      const groupIssueResult = groupIssuesObject?.results;

      // if groupIssueResult is undefined then continue the loop
      if (!groupIssueResult) continue;

      // set grouped Issue count of the current groupId
      set(groupedIssueCount, [groupId], groupIssuesObject.total_results);

      // if groupIssueResult, the it is not subGrouped
      if (Array.isArray(groupIssueResult)) {
        // add the result to issueList
        issueList.push(...groupIssueResult);
        // set the issue Ids to the groupId path
        set(
          groupedIssues,
          [groupId],
          groupIssueResult.map((issue) => issue.id)
        );
        continue;
      }

      // loop through all the subGroupIds from issue Result
      for (const subGroupId in groupIssueResult) {
        const subGroupIssuesObject = groupIssueResult[subGroupId];
        const subGroupIssueResult = subGroupIssuesObject?.results;

        // if subGroupIssueResult is undefined then continue the loop
        if (!subGroupIssueResult) continue;

        // set sub grouped Issue count of the current groupId
        set(groupedIssueCount, [getGroupKey(groupId, subGroupId)], subGroupIssuesObject.total_results);

        if (Array.isArray(subGroupIssueResult)) {
          // add the result to issueList
          issueList.push(...subGroupIssueResult);
          // set the issue Ids to the [groupId, subGroupId] path
          set(
            groupedIssues,
            [groupId, subGroupId],
            subGroupIssueResult.map((issue) => issue.id)
          );

          continue;
        }
      }
    }

    return { issueList, groupedIssues, groupedIssueCount };
  }

  /**
   * This method is used to update the grouped issue Ids to it's respected lists and also to update group Issue Counts
   * @param groupedIssues Object that contains list of issueIds with respect to their groups/subgroups
   * @param groupedIssueCount Object the contains the issue count of each groups
   * @param groupId groupId string
   * @param subGroupId subGroupId string
   * @returns updates the store with the values
   */
  updateGroupedIssueIds(
    groupedIssues: TIssues,
    groupedIssueCount: TGroupedIssueCount,
    groupId?: string,
    subGroupId?: string
  ) {
    // if groupId exists and groupedIssues has ALL_ISSUES as a group,
    // then it's an individual group/subgroup pagination
    if (groupId && groupedIssues[ALL_ISSUES] && Array.isArray(groupedIssues[ALL_ISSUES])) {
      const issueGroup = groupedIssues[ALL_ISSUES];
      const issueGroupCount = groupedIssueCount[ALL_ISSUES];
      const issuesPath = [groupId];
      // issuesPath is the path for the issue List in the Grouped Issue List
      // issuePath is either [groupId] for grouped pagination or [groupId, subGroupId] for subGrouped pagination
      if (subGroupId) issuesPath.push(subGroupId);

      // update the issue Count of the particular group/subGroup
      set(this.groupedIssueCount, [getGroupKey(groupId, subGroupId)], issueGroupCount);

      // update the issue list in the issuePath
      this.updateIssueGroup(issueGroup, issuesPath);
      return;
    }

    // if not in the above condition the it's a complete grouped pagination not individual group/subgroup pagination
    // update total issue count as ALL_ISSUES count in `groupedIssueCount` object
    set(this.groupedIssueCount, [ALL_ISSUES], groupedIssueCount[ALL_ISSUES]);

    // loop through the groups of groupedIssues.
    // oxlint-disable-next-line no-shadow
    for (const groupId in groupedIssues) {
      const issueGroup = groupedIssues[groupId];
      const issueGroupCount = groupedIssueCount[groupId];

      // update the groupId's issue count
      set(this.groupedIssueCount, [groupId], issueGroupCount);

      // This updates the group issue list in the store, if the issueGroup is a string
      const storeUpdated = this.updateIssueGroup(issueGroup, [groupId]);
      // if issueGroup is indeed a string, continue
      if (storeUpdated) continue;

      // if issueGroup is not a string, loop through the sub group Issues
      // oxlint-disable-next-line no-shadow
      for (const subGroupId in issueGroup) {
        const issueSubGroup = (issueGroup as TGroupedIssues)[subGroupId];
        const issueSubGroupCount = groupedIssueCount[getGroupKey(groupId, subGroupId)];

        // update the subGroupId's issue count
        set(this.groupedIssueCount, [getGroupKey(groupId, subGroupId)], issueSubGroupCount);
        // This updates the subgroup issue list in the store
        this.updateIssueGroup(issueSubGroup, [groupId, subGroupId]);
      }
    }
  }

  /**
   * This Method is used to update the issue Id list at the particular issuePath
   * @param groupedIssueIds could be an issue Id List for grouped issues or an object that contains a issue Id list in case of subGrouped
   * @param issuePath array of string, to identify the path of the issueList to be updated with the above issue Id list
   * @returns a boolean that indicates if the groupedIssueIds is indeed a array Id list, in which case the issue Id list is added to the store at issuePath
   */
  updateIssueGroup(groupedIssueIds: TGroupedIssues | string[], issuePath: string[]): boolean {
    if (!groupedIssueIds) return true;

    // if groupedIssueIds is an array, update the `groupedIssueIds` store at the issuePath
    if (groupedIssueIds && Array.isArray(groupedIssueIds)) {
      update(this, ["groupedIssueIds", ...issuePath], (issueIds: string[] = []) =>
        this.issuesSortWithOrderBy(uniq(concat(issueIds, groupedIssueIds)), this.orderBy)
      );
      // return true to indicate the store has been updated
      return true;
    }

    // return false to indicate the store has been updated and the groupedIssueIds is likely Object for subGrouped Issues
    return false;
  }
}
