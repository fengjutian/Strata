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
import type { IArchivedIssuesFilter } from "./filter.store";
import { ArchivedIssues } from "./issue.store";

function setup() {
  const { rootStore } = makeRootStore();
  const filterStore = makeFilterStore();
  const store = new ArchivedIssues(rootStore as IIssueRootStore, filterStore as unknown as IArchivedIssuesFilter);
  store.fetchParentStats = async () => {};
  return { store, filterStore };
}

describe("ArchivedIssues", () => {
  it("fetches archived work items through the archive service", async () => {
    const { store, filterStore } = setup();
    const page = makeResponse([makeIssue("i1"), makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })]);
    store.issueArchiveService.getArchivedIssues = vi.fn(async () => page);

    const response = await store.fetchIssues("ws", "project-1", "init-loader", paginationOptions);

    expect(response).toBe(page);
    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(filterStore.getFilterParams).toHaveBeenCalledWith(
      paginationOptions,
      "project-1",
      undefined,
      undefined,
      undefined
    );
    expect(store.issueArchiveService.getArchivedIssues).toHaveBeenCalledWith(
      "ws",
      "project-1",
      {},
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("appends the next page of archived work items", async () => {
    const { store } = setup();
    store.issueArchiveService.getArchivedIssues = vi
      .fn()
      .mockResolvedValueOnce(makeResponse([makeIssue("i1")]))
      .mockResolvedValueOnce(
        makeResponse([makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })], { next_page_results: false })
      );

    await store.fetchIssues("ws", "project-1", "init-loader", paginationOptions);
    await store.fetchNextIssues("ws", "project-1");

    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.getIssueLoader()).toBeUndefined();
  });
});
