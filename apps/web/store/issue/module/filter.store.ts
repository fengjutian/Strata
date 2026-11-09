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

export interface IModuleIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    moduleId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(moduleId: string): IIssueFilters | undefined;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string, moduleId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    moduleId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    moduleId: string
  ) => Promise<void>;
}

export class ModuleIssuesFilter extends BaseIssueFiltersStore implements IModuleIssuesFilter {
  constructor(_rootStore: IIssueRootStore) {
    const issueFilterService = new IssueFiltersService();

    super(_rootStore, {
      storeType: EIssuesStoreType.MODULE,
      scopeParam: "module",
      getScopeId: () => _rootStore.moduleId,
      fetchFilters: (workspaceSlug, projectId, moduleId) =>
        issueFilterService.fetchModuleIssueFilters(workspaceSlug, projectId, moduleId),
      patchFilters: (workspaceSlug, projectId, moduleId, data) =>
        issueFilterService.patchModuleIssueFilters(workspaceSlug, projectId, moduleId, data),
      clearIssues: () => _rootStore.moduleIssues.clear(true),
      refetchIssues: (workspaceSlug, projectId, moduleId) => {
        _rootStore.moduleIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation", moduleId);
      },
      localScope: (moduleId) => ({ viewId: moduleId, userId: _rootStore.currentUserId }),
    });
  }
}
