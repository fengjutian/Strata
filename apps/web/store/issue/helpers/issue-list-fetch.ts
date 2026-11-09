/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { runInAction } from "mobx";
// types
import type { IssuePaginationOptions, TIssueParams, TIssuesResponse, TLoader, TPaginationData } from "@strata/types";

export type TIssueListFilterParams = Partial<Record<TIssueParams, string | boolean>>;

interface IIssueListFilterStore {
  getFilterParams: (
    options: IssuePaginationOptions,
    scopeId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => TIssueListFilterParams | undefined;
}

/**
 * The part of an issue list store the fetch helpers need. Every list store
 * (project, cycle, module, profile, view, workspace, archived) implements it
 * through `BaseIssuesStore`.
 */
export interface IIssueListFetchStore {
  issueFilterStore?: IIssueListFilterStore;
  paginationOptions: IssuePaginationOptions | undefined;
  setLoader(loader: TLoader, groupId?: string, subGroupId?: string): void;
  clear(shouldClearPaginationOptions?: boolean): void;
  getPaginationData(groupId?: string, subGroupId?: string): TPaginationData | undefined;
  getNextCursor(groupId?: string, subGroupId?: string): string | undefined;
  onfetchIssues(
    response: TIssuesResponse,
    options: IssuePaginationOptions,
    workspaceSlug: string,
    projectId?: string,
    id?: string,
    shouldClearPaginationOptions?: boolean
  ): void;
  onfetchNexIssues(response: TIssuesResponse, groupId?: string, subGroupId?: string): void;
}

export interface IFetchIssuePageArgs {
  workspaceSlug: string;
  projectId?: string;
  /** Id handed to the filter store (cycle id, module id, view id, project id, user id). */
  scopeId: string;
  /** Id handed to `onfetchIssues` for parent stats. Defaults to `scopeId`; pass undefined to skip it. */
  parentStatsId?: string;
  loadType: TLoader;
  options: IssuePaginationOptions;
  isExistingPaginationOptions?: boolean;
  load: (params: TIssueListFilterParams | undefined) => Promise<TIssuesResponse>;
  /** Store specific param post-processing (e.g. the profile view filters). */
  transformParams?: (params: TIssueListFilterParams) => TIssueListFilterParams;
}

export interface IFetchNextIssuePageArgs {
  workspaceSlug: string;
  projectId?: string;
  scopeId: string;
  groupId?: string;
  subGroupId?: string;
  load: (params: TIssueListFilterParams | undefined) => Promise<TIssuesResponse>;
  transformParams?: (params: TIssueListFilterParams) => TIssueListFilterParams;
}

const buildParams = (
  store: IIssueListFetchStore,
  options: IssuePaginationOptions,
  scopeId: string,
  cursor: string | undefined,
  groupId: string | undefined,
  subGroupId: string | undefined,
  transformParams?: (params: TIssueListFilterParams) => TIssueListFilterParams
) => {
  const params = store.issueFilterStore?.getFilterParams(options, scopeId, cursor, groupId, subGroupId);
  return transformParams ? transformParams(params ?? {}) : params;
};

/**
 * Loads the first page of an issue list: toggles the loader, clears the current
 * list, asks the filter store for the query params and feeds the response back
 * into the store.
 */
export async function fetchIssuePage(store: IIssueListFetchStore, args: IFetchIssuePageArgs) {
  try {
    runInAction(() => {
      store.setLoader(args.loadType);
      store.clear(!args.isExistingPaginationOptions);
    });

    const params = buildParams(
      store,
      args.options,
      args.scopeId,
      undefined,
      undefined,
      undefined,
      args.transformParams
    );
    const response = await args.load(params);

    store.onfetchIssues(
      response,
      args.options,
      args.workspaceSlug,
      args.projectId,
      args.parentStatsId ?? args.scopeId,
      !args.isExistingPaginationOptions
    );

    return response;
  } catch (error) {
    store.setLoader(undefined);
    throw error;
  }
}

/**
 * Loads the next page of an issue list, either for a specific group/sub group or
 * for the whole list, and appends the response.
 */
export async function fetchNextIssuePage(store: IIssueListFetchStore, args: IFetchNextIssuePageArgs) {
  const cursorObject = store.getPaginationData(args.groupId, args.subGroupId);
  if (!store.paginationOptions || (cursorObject && !cursorObject.nextPageResults)) return;

  try {
    store.setLoader("pagination", args.groupId, args.subGroupId);

    const params = buildParams(
      store,
      store.paginationOptions,
      args.scopeId,
      store.getNextCursor(args.groupId, args.subGroupId),
      args.groupId,
      args.subGroupId,
      args.transformParams
    );
    const response = await args.load(params);

    store.onfetchNexIssues(response, args.groupId, args.subGroupId);
    return response;
  } catch (error) {
    store.setLoader(undefined, args.groupId, args.subGroupId);
    throw error;
  }
}
