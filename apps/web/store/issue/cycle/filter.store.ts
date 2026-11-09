/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TSupportedFilterTypeForUpdate } from "@strata/constants";
import type {
  IIssueFilters,
  IssuePaginationOptions,
  TIssueParams,
  TWorkItemFilterExpression,
  TSupportedFilterForUpdate,
} from "@strata/types";
import { EIssuesStoreType } from "@strata/types";
import { IssueFiltersService } from "@/services/issue_filter.service";
import { BaseIssueFiltersStore } from "../helpers/base-issue-filters.store";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

export interface ICycleIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    cycleId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(cycleId: string): IIssueFilters | undefined;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string, cycleId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    cycleId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    cycleId: string
  ) => Promise<void>;
}

export class CycleIssuesFilter extends BaseIssueFiltersStore implements ICycleIssuesFilter {
  constructor(_rootStore: IIssueRootStore) {
    const issueFilterService = new IssueFiltersService();

    super(_rootStore, {
      storeType: EIssuesStoreType.CYCLE,
      scopeParam: "cycle",
      getScopeId: () => _rootStore.cycleId,
      fetchFilters: (workspaceSlug, projectId, cycleId) =>
        issueFilterService.fetchCycleIssueFilters(workspaceSlug, projectId, cycleId),
      patchFilters: (workspaceSlug, projectId, cycleId, data) =>
        issueFilterService.patchCycleIssueFilters(workspaceSlug, projectId, cycleId, data),
      clearIssues: () => _rootStore.cycleIssues.clear(true),
      refetchIssues: (workspaceSlug, projectId, cycleId) => {
        _rootStore.cycleIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation", cycleId);
      },
      localScope: (cycleId) => ({ viewId: cycleId, userId: _rootStore.currentUserId }),
    });
  }
}
