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
import { ProjectService } from "@/services/project";
import { BaseIssueFiltersStore } from "../helpers/base-issue-filters.store";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

export interface IProjectIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    projectId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(projectId: string): IIssueFilters | undefined;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate
  ) => Promise<void>;
}

/**
 * Project scoped filters. The scope is the project itself, so no scope query
 * param is added and the filter bucket key falls back to the project id.
 */
export class ProjectIssuesFilter extends BaseIssueFiltersStore implements IProjectIssuesFilter {
  constructor(_rootStore: IIssueRootStore) {
    const projectService = new ProjectService();

    super(_rootStore, {
      storeType: EIssuesStoreType.PROJECT,
      getScopeId: () => _rootStore.projectId,
      fetchFilters: (workspaceSlug, projectId) => projectService.getProjectUserProperties(workspaceSlug, projectId),
      patchFilters: (workspaceSlug, projectId, _scopeId, data) =>
        projectService.updateProjectUserProperties(workspaceSlug, projectId, data),
      refetchIssues: (workspaceSlug, projectId) => {
        _rootStore.projectIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
      },
      localScope: (projectId) => ({ viewId: projectId, userId: _rootStore.currentUserId }),
    });
  }
}
