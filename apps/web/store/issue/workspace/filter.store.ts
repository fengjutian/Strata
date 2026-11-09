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
  TStaticViewTypes,
  TSupportedFilterForUpdate,
  TWorkItemFilterExpression,
} from "@strata/types";
import { EIssueLayoutTypes, EIssuesStoreType, STATIC_VIEW_TYPES } from "@strata/types";
import { WorkspaceService } from "@/services/workspace.service";
//
import type { TIssueFiltersSource } from "../helpers/base-issue-filters.store";
import { BaseIssueFiltersStore } from "../helpers/base-issue-filters.store";
import type { IBaseIssueFilterStore, IIssueFilterHelperStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

type TWorkspaceFilters = TStaticViewTypes;

export type TBaseFilterStore = IBaseIssueFilterStore & IIssueFilterHelperStore;

export interface IWorkspaceIssuesFilter extends TBaseFilterStore {
  // fetch action
  fetchFilters: (workspaceSlug: string, viewId: string) => Promise<void>;
  updateFilterExpression: (workspaceSlug: string, viewId: string, filters: TWorkItemFilterExpression) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string | undefined,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    viewId: string
  ) => Promise<void>;
  //helper action
  getIssueFilters: (viewId: string | undefined) => IIssueFilters | undefined;
  getAppliedFilters: (viewId: string) => Partial<Record<TIssueParams, string | boolean>> | undefined;
  getFilterParams: (
    options: IssuePaginationOptions,
    viewId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
}

/**
 * Workspace ("my issues") filters. Static views keep their display settings in
 * the local filter storage; custom views load everything from the view details
 * and never persist display changes.
 */
export class WorkspaceIssuesFilter extends BaseIssueFiltersStore implements IWorkspaceIssuesFilter {
  private readonly workspaceService: WorkspaceService;

  constructor(_rootStore: IIssueRootStore) {
    const workspaceService = new WorkspaceService();

    super(_rootStore, {
      storeType: EIssuesStoreType.GLOBAL,
      getScopeId: () => _rootStore.globalViewId,
      layoutKey: "my_issues",
      paramsLayout: EIssueLayoutTypes.SPREADSHEET,
      displayFilterDefaults: { layout: EIssueLayoutTypes.SPREADSHEET, order_by: "-created_at" },
      normalizeDisplayFilters: (filters) =>
        filters.order_by === "sort_order" ? { ...filters, order_by: "-created_at" } : filters,
      persistRichFilters: false,
      refetchIssues: (workspaceSlug, _projectId, viewId) => {
        _rootStore.workspaceIssues.fetchIssuesWithExistingPagination(workspaceSlug, viewId, "mutation");
      },
      localScope: (viewId) => ({ viewId: undefined, userId: viewId }),
    });

    this.workspaceService = workspaceService;
  }

  protected override async loadFilters(workspaceSlug: string, _projectId: string, viewId: string) {
    const localFilters = this.handleIssuesLocalFilters.get(EIssuesStoreType.GLOBAL, workspaceSlug, undefined, viewId) as
      | {
          display_filters?: IIssueDisplayFilterOptions;
          display_properties?: IIssueDisplayProperties;
          kanban_filters?: TIssueKanbanFilters;
        }
      | undefined;

    const source: TIssueFiltersSource = {
      display_filters: localFilters?.display_filters,
      display_properties: localFilters?.display_properties,
      kanban_filters: localFilters?.kanban_filters,
    };

    // Custom views carry their own filters; static views only have display settings.
    if (!STATIC_VIEW_TYPES.includes(viewId as TWorkspaceFilters)) {
      const viewDetails = await this.workspaceService.getViewDetails(workspaceSlug, viewId);
      source.rich_filters = viewDetails?.rich_filters;
      source.display_filters = viewDetails?.display_filters;
      source.display_properties = viewDetails?.display_properties;
    }

    return source;
  }

  /** Only the static views persist display changes locally. */
  protected override persistFilters(
    workspaceSlug: string,
    _projectId: string,
    viewId: string,
    type: EIssueFilterType,
    payload: TSupportedFilterForUpdate | TWorkItemFilterExpression
  ) {
    if (STATIC_VIEW_TYPES.includes(viewId as TWorkspaceFilters)) {
      this.handleIssuesLocalFilters.set(EIssuesStoreType.GLOBAL, type, workspaceSlug, undefined, viewId, {
        [type]: payload,
      });
    }
    return Promise.resolve();
  }

  /** Static views imply a fixed condition (assignee, creator, subscriber). */
  protected override extendFilterParams(
    params: Partial<Record<TIssueParams, string | boolean>>,
    viewId: string
  ): Partial<Record<TIssueParams, string | boolean>> {
    if (!STATIC_VIEW_TYPES.includes(viewId as TWorkspaceFilters)) return params;

    const conditions = this.getFilterConditionBasedOnViews(
      this.rootIssueStore.currentUserId,
      viewId as TWorkspaceFilters
    );
    return conditions ? { ...params, ...conditions } : params;
  }
}
