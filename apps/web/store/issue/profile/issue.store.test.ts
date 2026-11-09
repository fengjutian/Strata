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
import type { IProfileIssuesFilter } from "./filter.store";
import { ProfileIssues } from "./issue.store";

function setup() {
  const { rootStore } = makeRootStore();
  const filterStore = makeFilterStore();
  const store = new ProfileIssues(rootStore as IIssueRootStore, filterStore as unknown as IProfileIssuesFilter);
  store.fetchParentStats = async () => {};
  return { store, filterStore };
}

describe("ProfileIssues", () => {
  it("fetches the profile issues and applies the view filter to the params", async () => {
    const { store } = setup();
    const page = makeResponse([makeIssue("i1"), makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })]);
    store.userService.getUserProfileIssues = vi.fn(async () => page);

    const response = await store.fetchIssues("ws", "user-1", "init-loader", paginationOptions, "assigned");

    expect(response).toBe(page);
    expect(store.currentView).toBe("assigned");
    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.userService.getUserProfileIssues).toHaveBeenCalledWith(
      "ws",
      "user-1",
      expect.objectContaining({ assignees: "user-1", created_by: undefined, subscriber: undefined }),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("appends the next page for the current profile view", async () => {
    const { store } = setup();
    store.userService.getUserProfileIssues = vi
      .fn()
      .mockResolvedValueOnce(makeResponse([makeIssue("i1")]))
      .mockResolvedValueOnce(
        makeResponse([makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })], { next_page_results: false })
      );

    await store.fetchIssues("ws", "user-1", "init-loader", paginationOptions, "created");
    await store.fetchNextIssues("ws", "user-1");

    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.getIssueLoader()).toBeUndefined();
  });
});
