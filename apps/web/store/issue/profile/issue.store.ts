/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, observable, makeObservable, computed } from "mobx";
// base class
import type {
  TIssue,
  TLoader,
  IssuePaginationOptions,
  TIssuesResponse,
  ViewFlags,
  TBulkOperationsPayload,
  TProfileViews,
} from "@strata/types";
import { UserService } from "@/services/user.service";

// services
// types
import type { IBaseIssuesStore } from "../helpers/base-issues.store";
import { BaseIssuesStore } from "../helpers/base-issues.store";
import type { TIssueListFilterParams } from "../helpers/issue-list-fetch";
import { fetchIssuePage, fetchNextIssuePage } from "../helpers/issue-list-fetch";
import type { IIssueRootStore } from "../root.store";
import type { IProfileIssuesFilter } from "./filter.store";

export interface IProfileIssues extends IBaseIssuesStore {
  // observable
  currentView: TProfileViews;
  viewFlags: ViewFlags;
  // actions
  setViewId: (viewId: TProfileViews) => void;
  // action
  fetchIssues: (
    workspaceSlug: string,
    userId: string,
    loadType: TLoader,
    option: IssuePaginationOptions,
    view: TProfileViews,
    isExistingPaginationOptions?: boolean
  ) => Promise<TIssuesResponse | undefined>;
  fetchIssuesWithExistingPagination: (
    workspaceSlug: string,
    userId: string,
    loadType: TLoader
  ) => Promise<TIssuesResponse | undefined>;
  fetchNextIssues: (
    workspaceSlug: string,
    userId: string,
    groupId?: string,
    subGroupId?: string
  ) => Promise<TIssuesResponse | undefined>;

  createIssue: (workspaceSlug: string, projectId: string, data: Partial<TIssue>) => Promise<TIssue>;
  updateIssue: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>;
  archiveIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  removeBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  archiveBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  bulkUpdateProperties: (workspaceSlug: string, projectId: string, data: TBulkOperationsPayload) => Promise<void>;

  quickAddIssue: undefined;
}

export class ProfileIssues extends BaseIssuesStore implements IProfileIssues {
  currentView: TProfileViews = "assigned";
  // filter store
  issueFilterStore: IProfileIssuesFilter;
  // services
  userService;

  constructor(_rootStore: IIssueRootStore, issueFilterStore: IProfileIssuesFilter) {
    super(_rootStore, issueFilterStore);
    makeObservable(this, {
      // observable
      currentView: observable.ref,
      // computed
      viewFlags: computed,
      // action
      setViewId: action.bound,
      fetchIssues: action,
      fetchNextIssues: action,
      fetchIssuesWithExistingPagination: action,
    });
    // filter store
    this.issueFilterStore = issueFilterStore;
    // services
    this.userService = new UserService();
  }

  get viewFlags() {
    if (this.currentView === "subscribed")
      return {
        enableQuickAdd: false,
        enableIssueCreation: false,
        enableInlineEditing: true,
      };
    return {
      enableQuickAdd: false,
      enableIssueCreation: true,
      enableInlineEditing: true,
    };
  }

  setViewId(viewId: TProfileViews) {
    this.currentView = viewId;
  }

  fetchParentStats = () => {};

  /** */
  updateParentStats = () => {};

  /**
   * This method is called to fetch the first issues of pagination
   * @param workspaceSlug
   * @param userId
   * @param loadType
   * @param options
   * @param view
   * @returns
   */
  fetchIssues: IProfileIssues["fetchIssues"] = async (
    workspaceSlug: string,
    userId: string,
    loadType: TLoader,
    options: IssuePaginationOptions,
    view: TProfileViews,
    isExistingPaginationOptions: boolean = false
  ) => {
    this.setViewId(view);

    return fetchIssuePage(this, {
      workspaceSlug,
      scopeId: userId,
      parentStatsId: undefined,
      loadType,
      options,
      isExistingPaginationOptions,
      transformParams: (params) => this.applyViewParams(params, userId),
      load: (params) =>
        this.userService.getUserProfileIssues(workspaceSlug, userId, params, { signal: this.controller.signal }),
    });
  };

  /**
   * Applies the current profile view to the query params. The plain user
   * filter must not carry the other views' conditions.
   */
  private applyViewParams(params: TIssueListFilterParams, userId: string): TIssueListFilterParams {
    const base = { ...params, assignees: undefined, created_by: undefined, subscriber: undefined };

    if (this.currentView === "assigned") return { ...base, assignees: userId };
    if (this.currentView === "created") return { ...base, created_by: userId };
    if (this.currentView === "subscribed") return { ...base, subscriber: userId };

    return base;
  }

  /**
   * This method is called subsequent pages of pagination
   * if groupId/subgroupId is provided, only that specific group's next page is fetched
   * else all the groups' next page is fetched
   * @param workspaceSlug
   * @param userId
   * @param groupId
   * @param subGroupId
   * @returns
   */
  fetchNextIssues = async (workspaceSlug: string, userId: string, groupId?: string, subGroupId?: string) =>
    fetchNextIssuePage(this, {
      workspaceSlug,
      scopeId: userId,
      groupId,
      subGroupId,
      transformParams: (params) => this.applyViewParams(params, userId),
      load: (params) => this.userService.getUserProfileIssues(workspaceSlug, userId, params),
    });

  /**
   * This Method exists to fetch the first page of the issues with the existing stored pagination
   * This is useful for refetching when filters, groupBy, orderBy etc changes
   * @param workspaceSlug
   * @param userId
   * @param loadType
   * @returns
   */
  fetchIssuesWithExistingPagination = async (workspaceSlug: string, userId: string, loadType: TLoader) => {
    if (!this.paginationOptions || !this.currentView) return;
    return await this.fetchIssues(workspaceSlug, userId, loadType, this.paginationOptions, this.currentView, true);
  };

  // Using aliased names as they cannot be overridden in other stores
  archiveBulkIssues = this.bulkArchiveIssues;
  updateIssue = this.issueUpdate;
  archiveIssue = this.issueArchive;

  // Setting them as undefined as they can not performed on profile issues
  quickAddIssue = undefined;
}
