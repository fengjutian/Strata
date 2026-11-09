/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { vi } from "vitest";
// types
import type { IssuePaginationOptions, TIssue, TIssuesResponse } from "@strata/types";
//
import type { IIssueRootStore } from "../root.store";

export const makeIssue = (id: string, overrides: Partial<TIssue> = {}): TIssue =>
  ({ id, created_at: "2026-01-01T00:00:00Z", ...overrides }) as TIssue;

export const makeResponse = (issues: TIssue[], overrides: Partial<TIssuesResponse> = {}): TIssuesResponse =>
  ({
    results: issues,
    total_count: issues.length,
    next_cursor: "50:1:0",
    prev_cursor: "50:0:0",
    next_page_results: true,
    ...overrides,
  }) as unknown as TIssuesResponse;

export const paginationOptions = { perPageCount: 50 } as unknown as IssuePaginationOptions;

/**
 * Minimal issue root store for list store tests: an issue map with the methods
 * the base store calls, the relation extractor and the state map.
 */
export function makeRootStore() {
  const issuesMap: Record<string, TIssue> = {};

  const rootStore = {
    issuesMap,
    issues: {
      issuesMap,
      addIssue: (list: TIssue[]) => {
        list.forEach((issue) => {
          issuesMap[issue.id] = { ...issuesMap[issue.id], ...issue };
        });
      },
      updateIssue: (issueId: string, data: Partial<TIssue>) => {
        issuesMap[issueId] = { ...issuesMap[issueId], ...data } as TIssue;
      },
      removeIssue: (issueId: string) => {
        delete issuesMap[issueId];
      },
      getIssueById: (issueId: string) => issuesMap[issueId],
      getIssuesByIds: (issueIds: string[]) => issueIds.map((issueId) => issuesMap[issueId]).filter(Boolean),
      getIssues: async () => {},
    },
    issueDetail: {
      relation: {
        extractRelationsFromIssues: () => {},
      },
    },
    rootStore: {
      state: { stateMap: {} },
      projectEstimate: {
        currentActiveEstimateIdByProjectId: () => undefined,
        estimateById: () => undefined,
      },
    },
  } as unknown as IIssueRootStore;

  return { rootStore, issuesMap };
}

/** Filter store double: only `getFilterParams` is used by the fetch methods. */
export function makeFilterStore(getFilterParams = vi.fn(() => ({}))) {
  return {
    issueFilters: { displayFilters: { layout: "list", order_by: "-created_at" }, richFilters: {} },
    getFilterParams,
  };
}
