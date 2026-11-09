/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { makeObservable, observable } from "mobx";
// strata constants
import { EIssueFilterType } from "@strata/constants";
import type { TSupportedFilterTypeForUpdate } from "@strata/constants";
// types
import type {
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  IssuePaginationOptions,
  TIssueKanbanFilters,
  TIssueParams,
  TSupportedFilterForUpdate,
  TWorkItemFilterExpression,
} from "@strata/types";
import { EIssuesStoreType } from "@strata/types";
//
import type { TIssueFiltersSource } from "../helpers/base-issue-filters.store";
import { BaseIssueFiltersStore } from "../helpers/base-issue-filters.store";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

export interface IWorkspaceDraftIssuesFilter extends IBaseIssueFilterStore {
  // observables
  workspaceSlug: string;
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    userId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  // action
  fetchFilters: (workspaceSlug: string) => Promise<void>;
  updateFilterExpression: (workspaceSlug: string, userId: string, filters: TWorkItemFilterExpression) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate
  ) => Promise<void>;
}

/**
 * Workspace draft filters. Local storage only, scoped by workspace slug; the
 * update action takes no explicit scope id.
 */
export class WorkspaceDraftIssuesFilter extends BaseIssueFiltersStore implements IWorkspaceDraftIssuesFilter {
  workspaceSlug = "";

  constructor(_rootStore: IIssueRootStore) {
    super(_rootStore, {
      storeType: EIssuesStoreType.PROFILE,
      getScopeId: () => _rootStore.workspaceSlug,
      layoutKey: "profile_issues",
      defaultGroupBy: "priority",
      refetchIssues: (workspaceSlug) => {
        _rootStore.profileIssues.fetchIssuesWithExistingPagination(workspaceSlug, workspaceSlug, "mutation");
      },
      localScope: (workspaceSlug) => ({ viewId: workspaceSlug, userId: undefined }),
    });

    makeObservable(this, {
      workspaceSlug: observable.ref,
    });
  }

  /** The draft store is scoped by the workspace, never by the project id. */
  protected override resolveScopeId(_projectId: string, scopeId?: string) {
    return scopeId || this.rootIssueStore.workspaceSlug || this.workspaceSlug;
  }

  protected override loadFilters(workspaceSlug: string, _projectId: string, scopeId: string) {
    this.workspaceSlug = scopeId;

    const localFilters = this.handleIssuesLocalFilters.get(
      EIssuesStoreType.PROFILE,
      workspaceSlug,
      scopeId,
      undefined
    ) as
      | {
          rich_filters?: TWorkItemFilterExpression;
          display_filters?: IIssueDisplayFilterOptions;
          display_properties?: IIssueDisplayProperties;
          kanban_filters?: TIssueKanbanFilters;
        }
      | undefined;

    return Promise.resolve<TIssueFiltersSource>({
      rich_filters: localFilters?.rich_filters,
      display_filters: localFilters?.display_filters,
      display_properties: localFilters?.display_properties,
      kanban_filters: localFilters?.kanban_filters,
    });
  }

  protected override persistFilters(
    workspaceSlug: string,
    _projectId: string,
    scopeId: string,
    type: EIssueFilterType,
    payload: TSupportedFilterForUpdate | TWorkItemFilterExpression
  ) {
    this.handleIssuesLocalFilters.set(EIssuesStoreType.PROFILE, type, workspaceSlug, scopeId, undefined, {
      [type]: payload,
    });
    return Promise.resolve();
  }
}
