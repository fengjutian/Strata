/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it, vi } from "vitest";
// types
import type { IssuePaginationOptions, TIssue, TIssuesResponse } from "@strata/types";
//
import type { IIssueRootStore } from "../root.store";
import type { ICycleIssuesFilter } from "./filter.store";
import { CycleIssues } from "./issue.store";

const makeIssue = (id: string, overrides: Partial<TIssue> = {}): TIssue =>
  ({ id, created_at: "2026-01-01T00:00:00Z", ...overrides }) as TIssue;

const makeResponse = (issues: TIssue[], overrides: Partial<TIssuesResponse> = {}): TIssuesResponse =>
  ({
    results: issues,
    total_count: issues.length,
    next_cursor: "50:1:0",
    prev_cursor: "50:0:0",
    next_page_results: true,
    ...overrides,
  }) as unknown as TIssuesResponse;

function setup() {
  const issuesMap: Record<string, TIssue> = {};

  const rootStore = {
    cycleId: "cycle-1",
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
      cycle: {
        fetchCycleDetails: vi.fn(),
        fetchActiveCycleProgressPro: vi.fn(),
        updateCycleDistribution: vi.fn(),
        getCycleById: vi.fn(() => ({ version: 1 })),
      },
      projectEstimate: {
        currentActiveEstimateIdByProjectId: () => undefined,
        estimateById: () => undefined,
        currentActiveEstimate: undefined,
      },
    },
  } as unknown as IIssueRootStore;

  const filterStore = {
    issueFilters: { displayFilters: { layout: "list", order_by: "-created_at" }, richFilters: {} },
    getFilterParams: vi.fn(() => ({})),
  } as unknown as ICycleIssuesFilter;

  const store = new CycleIssues(rootStore, filterStore);
  store.fetchParentStats = () => {};
  store.updateParentStats = () => {};

  return { store, issuesMap, filterStore, rootStore };
}

const paginationOptions = { perPageCount: 50 } as unknown as IssuePaginationOptions;

describe("CycleIssues", () => {
  it("fetches the first page, stores the cursor and fills the grouped list", async () => {
    const { store, filterStore } = setup();
    const page = makeResponse([makeIssue("i1"), makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })]);
    store.issueService.getIssues = vi.fn(async () => page);

    const response = await store.fetchIssues("ws", "project-1", "init-loader", paginationOptions, "cycle-1");

    expect(response).toBe(page);
    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.paginationOptions).toEqual(paginationOptions);
    expect(store.getPaginationData(undefined, undefined)?.nextCursor).toBe("50:1:0");
    expect(filterStore.getFilterParams).toHaveBeenCalledWith(
      paginationOptions,
      "cycle-1",
      undefined,
      undefined,
      undefined
    );
    expect(store.issueService.getIssues).toHaveBeenCalledWith(
      "ws",
      "project-1",
      {},
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("appends the next page and clears the pagination loader", async () => {
    const { store } = setup();
    store.issueService.getIssues = vi
      .fn()
      .mockResolvedValueOnce(makeResponse([makeIssue("i1")]))
      .mockResolvedValueOnce(
        makeResponse([makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })], {
          next_cursor: "50:2:0",
          prev_cursor: "50:1:0",
          next_page_results: false,
        })
      );

    await store.fetchIssues("ws", "project-1", "init-loader", paginationOptions, "cycle-1");
    await store.fetchNextIssues("ws", "project-1", "cycle-1");

    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.getIssueLoader()).toBeUndefined();
    expect(store.getPaginationData(undefined, undefined)?.nextPageResults).toBe(false);
  });
});
