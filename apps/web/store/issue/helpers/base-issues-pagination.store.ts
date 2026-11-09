/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { get, set } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// strata constants
import { ALL_ISSUES } from "@strata/constants";
// types
import type {
  IssuePaginationOptions,
  TGroupedIssueCount,
  TGroupedIssues,
  TIssuePaginationData,
  TIssuesResponse,
  TLoader,
  TPaginationData,
  TSubGroupedIssues,
} from "@strata/types";
import { EIssueLayoutTypes, EIssueServiceType } from "@strata/types";
// strata web imports
// services
import { CycleService } from "@/services/cycle.service";
import { IssueArchiveService, IssueService } from "@/services/issue";
import { ModuleService } from "@/services/module.service";
//
import type { IIssueRootStore } from "../root.store";
import { ISSUE_GROUP_BY_KEY, ISSUE_ORDERBY_KEY } from "./base-issues.types";
import { getGroupKey } from "./base-issues-utils";
import type { IBaseIssueFilterStore } from "./issue-filter-helper.store";

/**
 * Holds the observable pagination/grouping state of an issue list plus the
 * services every list needs. This is the root of the base issue store chain.
 */
export abstract class BaseIssuePaginationStore {
  loader: Record<string, TLoader> = {};
  groupedIssueIds: TGroupedIssues | TSubGroupedIssues | undefined = undefined;
  issuePaginationData: TIssuePaginationData = {};
  groupedIssueCount: TGroupedIssueCount = {};
  //
  paginationOptions: IssuePaginationOptions | undefined = undefined;

  isArchived: boolean;

  // services
  issueService;
  issueArchiveService;
  moduleService;
  cycleService;
  // root store
  rootIssueStore;
  issueFilterStore;
  // API Abort controller
  controller: AbortController;

  constructor(
    _rootStore: IIssueRootStore,
    issueFilterStore: IBaseIssueFilterStore,
    isArchived = false,
    serviceType = EIssueServiceType.ISSUES
  ) {
    makeObservable(this, {
      // observable
      loader: observable,
      groupedIssueIds: observable,
      issuePaginationData: observable,
      groupedIssueCount: observable,

      paginationOptions: observable,
      // computed
      moduleId: computed,
      cycleId: computed,
      orderBy: computed,
      groupBy: computed,
      subGroupBy: computed,
      orderByKey: computed,
      issueGroupKey: computed,
      issueSubGroupKey: computed,
      // action
      storePreviousPaginationValues: action.bound,
      setLoader: action.bound,
      clear: action.bound,
    });
    this.rootIssueStore = _rootStore;
    this.issueFilterStore = issueFilterStore;

    this.isArchived = isArchived;

    this.issueService = new IssueService(serviceType);
    this.issueArchiveService = new IssueArchiveService();
    this.moduleService = new ModuleService();
    this.cycleService = new CycleService();

    this.controller = new AbortController();
  }

  // current Module Id from url
  get moduleId() {
    return this.rootIssueStore.moduleId;
  }

  // current Cycle Id from url
  get cycleId() {
    return this.rootIssueStore.cycleId;
  }

  // current Order by value
  get orderBy() {
    const displayFilters = this.issueFilterStore?.issueFilters?.displayFilters;
    if (!displayFilters) return;

    return displayFilters?.order_by;
  }

  // current Group by value
  get groupBy() {
    const displayFilters = this.issueFilterStore?.issueFilters?.displayFilters;
    if (!displayFilters || !displayFilters?.layout) return;

    const layout = displayFilters?.layout;

    return layout === EIssueLayoutTypes.CALENDAR
      ? "target_date"
      : [EIssueLayoutTypes.LIST, EIssueLayoutTypes.KANBAN]?.includes(layout)
        ? displayFilters?.group_by
        : undefined;
  }

  // current Sub group by value
  get subGroupBy() {
    const displayFilters = this.issueFilterStore?.issueFilters?.displayFilters;
    if (!displayFilters || displayFilters.group_by === displayFilters.sub_group_by) return;

    return displayFilters?.layout === "kanban" ? displayFilters?.sub_group_by : undefined;
  }

  getIssueIds = (groupId?: string, subGroupId?: string) => {
    const groupedIssueIds = this.groupedIssueIds;

    if (!groupedIssueIds) return undefined;

    const allIssues = groupedIssueIds[ALL_ISSUES] ?? [];
    if (!this.groupBy && !this.subGroupBy && allIssues && Array.isArray(allIssues)) {
      return allIssues;
    }

    if (this.groupBy && groupId && groupedIssueIds?.[groupId] && Array.isArray(groupedIssueIds[groupId])) {
      return groupedIssueIds[groupId] ?? [];
    }

    if (this.groupBy && this.subGroupBy && groupId && subGroupId) {
      return (groupedIssueIds as TSubGroupedIssues)[groupId]?.[subGroupId] ?? [];
    }

    return undefined;
  };

  // The Issue Property corresponding to the order by value
  get orderByKey() {
    // oxlint-disable-next-line no-shadow
    const orderBy = this.orderBy;
    if (!orderBy) return;

    return ISSUE_ORDERBY_KEY[orderBy];
  }

  // The Issue Property corresponding to the group by value
  get issueGroupKey() {
    const groupBy = this.groupBy;

    if (!groupBy) return;

    return ISSUE_GROUP_BY_KEY[groupBy];
  }

  // The Issue Property corresponding to the sub group by value
  get issueSubGroupKey() {
    const subGroupBy = this.subGroupBy;

    if (!subGroupBy) return;

    return ISSUE_GROUP_BY_KEY[subGroupBy];
  }

  /**
   * Store the pagination data required for next subsequent issue pagination calls
   * @param prevCursor cursor value of previous page
   * @param nextCursor cursor value of next page
   * @param nextPageResults boolean to indicate if the next page results exist i.e, have we reached end of pages
   * @param groupId groupId and subGroupId to add the pagination data for the particular group/subgroup
   * @param subGroupId
   */
  setPaginationData(
    prevCursor: string,
    nextCursor: string,
    nextPageResults: boolean,
    groupId?: string,
    subGroupId?: string
  ) {
    const cursorObject = {
      prevCursor,
      nextCursor,
      nextPageResults,
    };

    set(this.issuePaginationData, [getGroupKey(groupId, subGroupId)], cursorObject);
  }

  /**
   * Sets the loader value of the particular groupId/subGroupId, or to ALL_ISSUES if both are undefined
   * @param loaderValue
   * @param groupId
   * @param subGroupId
   */
  setLoader(loaderValue: TLoader, groupId?: string, subGroupId?: string) {
    runInAction(() => {
      set(this.loader, getGroupKey(groupId, subGroupId), loaderValue);
    });
  }

  /**
   * gets the Loader value of particular group/subgroup/ALL_ISSUES
   */
  getIssueLoader = (groupId?: string, subGroupId?: string) => get(this.loader, getGroupKey(groupId, subGroupId));

  /**
   * gets the pagination data of particular group/subgroup/ALL_ISSUES
   */
  getPaginationData = computedFn(
    (groupId: string | undefined, subGroupId: string | undefined): TPaginationData | undefined =>
      get(this.issuePaginationData, [getGroupKey(groupId, subGroupId)])
  );

  /**
   * gets the issue count of particular group/subgroup/ALL_ISSUES
   *
   * if isSubGroupCumulative is true, sum up all the issueCount of the subGroupId, across all the groupIds
   */
  getGroupIssueCount = computedFn(
    (
      groupId: string | undefined,
      subGroupId: string | undefined,
      isSubGroupCumulative: boolean
    ): number | undefined => {
      if (isSubGroupCumulative && subGroupId) {
        const groupIssuesKeys = Object.keys(this.groupedIssueCount);
        let subGroupCumulativeCount = 0;

        for (const groupKey of groupIssuesKeys) {
          if (groupKey.includes(`_${subGroupId}`)) subGroupCumulativeCount += this.groupedIssueCount[groupKey];
        }

        return subGroupCumulativeCount;
      }

      return get(this.groupedIssueCount, [getGroupKey(groupId, subGroupId)]);
    }
  );

  /**
   * Gets the next page cursor based on number of issues currently available
   * @param groupId groupId for the cursor
   * @param subGroupId subgroupId for cursor
   * @returns next page cursor or undefined
   */
  getNextCursor = (groupId: string | undefined, subGroupId: string | undefined): string | undefined => {
    const groupedIssues = this.getIssueIds(groupId, subGroupId) ?? [];
    const currentIssueCount = groupedIssues.length;

    if (!this.paginationOptions) return;

    const { perPageCount } = this.paginationOptions;
    const nextPage = Math.floor(currentIssueCount / perPageCount);

    return `${perPageCount}:${nextPage}:0`;
  };

  /**
   * Method called to clear out the current store
   */
  clear(shouldClearPaginationOptions = true) {
    runInAction(() => {
      this.groupedIssueIds = undefined;
      this.issuePaginationData = {};
      this.groupedIssueCount = {};
      if (shouldClearPaginationOptions) {
        this.paginationOptions = undefined;
      }
    });
    this.controller.abort();
    this.controller = new AbortController();
  }

  /**
   * This Method is called to store the pagination options and paginated data from response
   * @param issuesResponse issue list response
   * @param options pagination options to be stored for next page call
   * @param groupId
   * @param subGroupId
   */
  storePreviousPaginationValues = (
    issuesResponse: TIssuesResponse,
    options?: IssuePaginationOptions,
    groupId?: string,
    subGroupId?: string
  ) => {
    if (options) this.paginationOptions = options;

    this.setPaginationData(
      issuesResponse.prev_cursor,
      issuesResponse.next_cursor,
      issuesResponse.next_page_results,
      groupId,
      subGroupId
    );
  };
}
