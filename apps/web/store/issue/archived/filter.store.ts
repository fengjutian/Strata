/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { EIssueFilterType } from "@strata/constants";
import type { TSupportedFilterTypeForUpdate } from "@strata/constants";
import type {
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  IIssueFilters,
  IssuePaginationOptions,
  TIssueKanbanFilters,
  TIssueParams,
  TSupportedFilterForUpdate,
  TWorkItemFilterExpression,
} from "@strata/types";
import { EIssuesStoreType } from "@strata/types";
import type { TIssueFiltersSource } from "../helpers/base-issue-filters.store";
import { BaseIssueFiltersStore } from "../helpers/base-issue-filters.store";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

export interface IArchivedIssuesFilter extends IBaseIssueFilterStore {
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
 * Archived work items have no server side user properties: both the filters and
 * the kanban toggles live in the local filter storage.
 */
export class ArchivedIssuesFilter extends BaseIssueFiltersStore implements IArchivedIssuesFilter {
  constructor(_rootStore: IIssueRootStore) {
    super(_rootStore, {
      storeType: EIssuesStoreType.ARCHIVED,
      getScopeId: () => _rootStore.projectId,
      refetchIssues: (workspaceSlug, projectId) => {
        _rootStore.archivedIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
      },
      localScope: (projectId) => ({ viewId: projectId, userId: undefined }),
    });
  }

  protected override loadFilters(workspaceSlug: string, _projectId: string, projectId: string) {
    const localFilters = this.handleIssuesLocalFilters.get(
      EIssuesStoreType.ARCHIVED,
      workspaceSlug,
      projectId,
      undefined
    ) as
      | {
          richFilters?: TWorkItemFilterExpression;
          display_filters?: IIssueDisplayFilterOptions;
          display_properties?: IIssueDisplayProperties;
          kanban_filters?: TIssueKanbanFilters;
        }
      | undefined;

    return Promise.resolve<TIssueFiltersSource>({
      // `richFilters` is the key this store has always read; the filter helper
      // writes `rich_filters`. Kept as-is so the migration stays behaviour neutral.
      rich_filters: localFilters?.richFilters as TWorkItemFilterExpression,
      display_filters: { ...localFilters?.display_filters, sub_issue: true },
      display_properties: localFilters?.display_properties,
      kanban_filters: localFilters?.kanban_filters,
    });
  }

  protected override persistFilters(
    workspaceSlug: string,
    _projectId: string,
    projectId: string,
    type: EIssueFilterType,
    payload: TSupportedFilterForUpdate | TWorkItemFilterExpression
  ) {
    this.handleIssuesLocalFilters.set(EIssuesStoreType.ARCHIVED, type, workspaceSlug, projectId, undefined, {
      [type]: payload,
    });
    return Promise.resolve();
  }
}
