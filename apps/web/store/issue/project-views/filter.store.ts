/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, runInAction } from "mobx";
import { set as lodashSet } from "lodash-es";
// strata constants
import type { TSupportedFilterTypeForUpdate } from "@strata/constants";
// types
import type {
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  IIssueFilters,
  IProjectView,
  IssuePaginationOptions,
  TIssueParams,
  TSupportedFilterForUpdate,
  TWorkItemFilterExpression,
} from "@strata/types";
import { EIssuesStoreType } from "@strata/types";
// services
import { ViewService } from "@/services/view.service";
//
import type { TIssueFiltersSource } from "../helpers/base-issue-filters.store";
import { BaseIssueFiltersStore } from "../helpers/base-issue-filters.store";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

export interface IProjectViewIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    viewId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(viewId: string): IIssueFilters | undefined;
  // helper actions
  mutateFilters: (workspaceSlug: string, viewId: string, viewDetails: IProjectView) => void;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string, viewId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    viewId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    viewId: string
  ) => Promise<void>;
  resetFilters: (workspaceSlug: string, viewId: string) => void;
}

/**
 * Project view filters. The filters always come from the saved view details and
 * display changes are never persisted - only the kanban toggles go to the local
 * filter storage.
 */
export class ProjectViewIssuesFilter extends BaseIssueFiltersStore implements IProjectViewIssuesFilter {
  private readonly issueFilterService: ViewService;

  constructor(_rootStore: IIssueRootStore) {
    const issueFilterService = new ViewService();

    super(_rootStore, {
      storeType: EIssuesStoreType.PROJECT_VIEW,
      getScopeId: () => _rootStore.viewId,
      persistRichFilters: false,
      clearIssues: () => _rootStore.projectIssues.clear(true),
      refetchIssues: (workspaceSlug, projectId, viewId) => {
        _rootStore.projectViewIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, viewId, "mutation");
      },
      localScope: (viewId) => ({ viewId, userId: _rootStore.currentUserId }),
    });

    this.issueFilterService = issueFilterService;
  }

  protected override async loadFilters(workspaceSlug: string, projectId: string, viewId: string) {
    const viewDetails = await this.issueFilterService.getViewDetails(workspaceSlug, projectId, viewId);

    return {
      rich_filters: viewDetails?.rich_filters,
      display_filters: viewDetails?.display_filters,
      display_properties: viewDetails?.display_properties,
    } as TIssueFiltersSource;
  }

  /** View filters are owned by the view itself; nothing is persisted from here. */
  protected override persistFilters() {
    return Promise.resolve();
  }

  mutateFilters = action((workspaceSlug: string, viewId: string, viewDetails: IProjectView) => {
    const richFilters: TWorkItemFilterExpression = viewDetails?.rich_filters;
    const displayFilters: IIssueDisplayFilterOptions = this.computedDisplayFilters(viewDetails?.display_filters);
    const displayProperties: IIssueDisplayProperties = this.computedDisplayProperties(viewDetails?.display_properties);

    // fetching the kanban toggle helpers in the local storage
    const kanbanFilters = {
      group_by: [],
      sub_group_by: [],
    };
    const currentUserId = this.rootIssueStore.currentUserId;
    if (currentUserId) {
      const _kanbanFilters = this.handleIssuesLocalFilters.get(
        EIssuesStoreType.PROJECT_VIEW,
        workspaceSlug,
        viewId,
        currentUserId
      );
      kanbanFilters.group_by = _kanbanFilters?.kanban_filters?.group_by || [];
      kanbanFilters.sub_group_by = _kanbanFilters?.kanban_filters?.sub_group_by || [];
    }

    runInAction(() => {
      lodashSet(this.filters, [viewId, "richFilters"], richFilters);
      lodashSet(this.filters, [viewId, "displayFilters"], displayFilters);
      lodashSet(this.filters, [viewId, "displayProperties"], displayProperties);
      lodashSet(this.filters, [viewId, "kanbanFilters"], kanbanFilters);
    });
  });

  /**
   * @description resets the filters for a project view
   * @param workspaceSlug
   * @param viewId
   */
  resetFilters: IProjectViewIssuesFilter["resetFilters"] = action((workspaceSlug, viewId) => {
    const viewDetails = this.rootIssueStore.rootStore.projectView.getViewById(viewId);
    if (!viewDetails) return;
    this.mutateFilters(workspaceSlug, viewId, viewDetails);
  });
}
