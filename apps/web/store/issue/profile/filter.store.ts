/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observable, makeObservable } from "mobx";
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
import type { TIssueFiltersSource } from "../helpers/base-issue-filters.store";
import { BaseIssueFiltersStore } from "../helpers/base-issue-filters.store";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

export interface IProfileIssuesFilter extends IBaseIssueFilterStore {
  // observables
  userId: string;
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    userId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  // action
  fetchFilters: (workspaceSlug: string, userId: string) => Promise<void>;
  updateFilterExpression: (workspaceSlug: string, userId: string, filters: TWorkItemFilterExpression) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string | undefined,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    userId: string
  ) => Promise<void>;
}

/**
 * Profile work item filters. Like archived, this is local storage only, but it
 * serialises for the `profile_issues` param family and defaults kanban
 * grouping to priority.
 */
export class ProfileIssuesFilter extends BaseIssueFiltersStore implements IProfileIssuesFilter {
  userId = "";

  constructor(_rootStore: IIssueRootStore) {
    super(_rootStore, {
      storeType: EIssuesStoreType.PROFILE,
      getScopeId: () => _rootStore.userId,
      layoutKey: "profile_issues",
      defaultGroupBy: "priority",
      refetchIssues: (workspaceSlug, _projectId, userId) => {
        _rootStore.profileIssues.fetchIssuesWithExistingPagination(workspaceSlug, userId, "mutation");
      },
      localScope: (userId) => ({ viewId: userId, userId: undefined }),
    });

    makeObservable(this, {
      userId: observable.ref,
    });
  }

  protected override loadFilters(workspaceSlug: string, _projectId: string, userId: string) {
    this.userId = userId;

    const localFilters = this.handleIssuesLocalFilters.get(
      EIssuesStoreType.PROFILE,
      workspaceSlug,
      userId,
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
    userId: string,
    type: EIssueFilterType,
    payload: TSupportedFilterForUpdate | TWorkItemFilterExpression
  ) {
    this.handleIssuesLocalFilters.set(EIssuesStoreType.PROFILE, type, workspaceSlug, userId, undefined, {
      [type]: payload,
    });
    return Promise.resolve();
  }
}
