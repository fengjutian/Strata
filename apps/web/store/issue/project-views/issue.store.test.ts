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
import type { IProjectViewIssuesFilter } from "./filter.store";
import { ProjectViewIssues } from "./issue.store";

function setup() {
  const { rootStore } = makeRootStore();
  const filterStore = makeFilterStore();
  const store = new ProjectViewIssues(rootStore as IIssueRootStore, filterStore as unknown as IProjectViewIssuesFilter);
  store.fetchParentStats = async () => {};
  return { store, filterStore };
}

describe("ProjectViewIssues", () => {
  it("fetches the first page with the view scoped filters", async () => {
    const { store, filterStore } = setup();
    const page = makeResponse([makeIssue("i1"), makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })]);
    store.issueService.getIssues = vi.fn(async () => page);

    const response = await store.fetchIssues("ws", "project-1", "view-1", "init-loader", paginationOptions);

    expect(response).toBe(page);
    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(filterStore.getFilterParams).toHaveBeenCalledWith(
      paginationOptions,
      "view-1",
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

  it("appends the next page of the view", async () => {
    const { store } = setup();
    store.issueService.getIssues = vi
      .fn()
      .mockResolvedValueOnce(makeResponse([makeIssue("i1")]))
      .mockResolvedValueOnce(
        makeResponse([makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })], { next_page_results: false })
      );

    await store.fetchIssues("ws", "project-1", "view-1", "init-loader", paginationOptions);
    await store.fetchNextIssues("ws", "project-1", "view-1");

    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.getIssueLoader()).toBeUndefined();
  });
});
