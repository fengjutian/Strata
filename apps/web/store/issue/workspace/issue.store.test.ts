/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it, vi } from "vitest";
//
import {
  makeFilterStore,
  makeIssue,
  makeResponse,
  makeRootStore,
  paginationOptions,
} from "../helpers/issue-store-test-utils";
import type { IIssueRootStore } from "../root.store";
import type { IWorkspaceIssuesFilter } from "./filter.store";
import { WorkspaceIssues } from "./issue.store";

function setup() {
  const { rootStore } = makeRootStore();
  const filterStore = makeFilterStore();
  const store = new WorkspaceIssues(rootStore as IIssueRootStore, filterStore as unknown as IWorkspaceIssuesFilter);
  store.fetchParentStats = async () => {};
  return { store, filterStore };
}

describe("WorkspaceIssues", () => {
  it("fetches the first page through the workspace view service", async () => {
    const { store, filterStore } = setup();
    const page = makeResponse([makeIssue("i1"), makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })]);
    store.workspaceService.getViewIssues = vi.fn(async () => page);

    const response = await store.fetchIssues("ws", "all-issues", "init-loader", paginationOptions);

    expect(response).toBe(page);
    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(filterStore.getFilterParams).toHaveBeenCalledWith(
      paginationOptions,
      "all-issues",
      undefined,
      undefined,
      undefined
    );
    expect(store.workspaceService.getViewIssues).toHaveBeenCalledWith(
      "ws",
      {},
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("appends the next page of the current view", async () => {
    const { store } = setup();
    store.workspaceService.getViewIssues = vi
      .fn()
      .mockResolvedValueOnce(makeResponse([makeIssue("i1")]))
      .mockResolvedValueOnce(
        makeResponse([makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })], { next_page_results: false })
      );

    await store.fetchIssues("ws", "all-issues", "init-loader", paginationOptions);
    await store.fetchNextIssues("ws", "all-issues");

    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.getIssueLoader()).toBeUndefined();
  });
});
