/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
// strata constants
import { EIssueFilterType } from "@strata/constants";
import { EIssuesStoreType } from "@strata/types";
import type { IIssueRootStore } from "../root.store";
import { ProfileIssuesFilter } from "./filter.store";

const makeRootStore = (userId: string | undefined = "user-1") =>
  ({
    userId,
    currentUserId: "user-1",
    profileIssues: {
      fetchIssuesWithExistingPagination: vi.fn(),
    },
  }) as unknown as IIssueRootStore;

const makeStore = () => {
  const store = new ProfileIssuesFilter(makeRootStore());
  const get = vi.fn(() => ({}));
  const set = vi.fn();
  Object.assign(store.handleIssuesLocalFilters, { get, set });
  return { store, get, set };
};

describe("ProfileIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the profile filters from local storage and remembers the user", async () => {
    const { store, get } = makeStore();
    get.mockReturnValue({
      rich_filters: { and: [] },
      display_filters: { layout: "list", group_by: "state" },
      display_properties: { assignee: true },
      kanban_filters: { group_by: [], sub_group_by: [] },
    });

    await store.fetchFilters("ws", "user-1");

    expect(get).toHaveBeenCalledWith(EIssuesStoreType.PROFILE, "ws", "user-1", undefined);
    expect(store.userId).toBe("user-1");
    expect(store.filters["user-1"].richFilters).toEqual({ and: [] });
    expect(store.filters["user-1"].displayProperties?.assignee).toBe(true);
  });

  it("defaults kanban grouping to priority", async () => {
    const { store } = makeStore();

    await store.fetchFilters("ws", "user-1");
    await store.updateFilters(
      "ws",
      undefined,
      EIssueFilterType.DISPLAY_FILTERS,
      {
        layout: "kanban",
        group_by: null,
      } as never,
      "user-1"
    );

    expect(store.filters["user-1"].displayFilters?.group_by).toBe("priority");
  });

  it("persists display properties locally with the profile scope", async () => {
    const { store, set } = makeStore();

    await store.fetchFilters("ws", "user-1");
    await store.updateFilters("ws", undefined, EIssueFilterType.DISPLAY_PROPERTIES, { assignee: false }, "user-1");

    expect(set).toHaveBeenCalledWith(
      EIssuesStoreType.PROFILE,
      EIssueFilterType.DISPLAY_PROPERTIES,
      "ws",
      "user-1",
      undefined,
      expect.objectContaining({ display_properties: expect.objectContaining({ assignee: false }) })
    );
  });

  it("stays inside the profile_issues param family", async () => {
    const { store } = makeStore();

    await store.fetchFilters("ws", "user-1");
    const params = store.getFilterParams({ perPageCount: 5 } as never, "user-1", undefined, undefined, undefined);

    expect(params.cursor).toBe("5:0:0");
    expect(params.per_page).toBe("5");
    expect(params).not.toHaveProperty("cycle");
    expect(params).not.toHaveProperty("module");
  });

  it("stores the rich filter expression locally and refetches", async () => {
    const rootStore = makeRootStore();
    const store = new ProfileIssuesFilter(rootStore);
    const set = vi.fn();
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(() => ({})), set });

    await store.fetchFilters("ws", "user-1");
    await store.updateFilterExpression("ws", "user-1", { and: ["assignee-1"] } as never);

    expect(store.filters["user-1"].richFilters).toEqual({ and: ["assignee-1"] });
    expect(set).toHaveBeenCalledWith(EIssuesStoreType.PROFILE, EIssueFilterType.FILTERS, "ws", "user-1", undefined, {
      rich_filters: { and: ["assignee-1"] },
    });
    expect(rootStore.profileIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith("ws", "user-1", "mutation");
  });
});
