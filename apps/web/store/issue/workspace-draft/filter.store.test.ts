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
import { WorkspaceDraftIssuesFilter } from "./filter.store";

const makeRootStore = () =>
  ({
    workspaceSlug: "ws-1",
    currentUserId: "user-1",
    profileIssues: {
      fetchIssuesWithExistingPagination: vi.fn(),
    },
  }) as unknown as IIssueRootStore;

const makeStore = () => {
  const store = new WorkspaceDraftIssuesFilter(makeRootStore());
  const get = vi.fn(() => ({}));
  const set = vi.fn();
  Object.assign(store.handleIssuesLocalFilters, { get, set });
  return { store, get, set };
};

describe("WorkspaceDraftIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the draft filters from local storage keyed by the workspace", async () => {
    const { store, get } = makeStore();
    get.mockReturnValue({
      rich_filters: { and: [] },
      display_filters: { layout: "list", group_by: "state" },
      display_properties: { assignee: true },
      kanban_filters: { group_by: [], sub_group_by: [] },
    });

    await store.fetchFilters("ws-1");

    expect(get).toHaveBeenCalledWith(EIssuesStoreType.PROFILE, "ws-1", "ws-1", undefined);
    expect(store.workspaceSlug).toBe("ws-1");
    expect(store.filters["ws-1"].richFilters).toEqual({ and: [] });
    expect(store.filters["ws-1"].displayProperties?.assignee).toBe(true);
  });

  it("accepts the scope-less updateFilters form and defaults kanban to priority", async () => {
    const { store, set } = makeStore();

    await store.fetchFilters("ws-1");
    await store.updateFilters("ws-1", EIssueFilterType.DISPLAY_FILTERS, {
      layout: "kanban",
      group_by: null,
    } as never);

    expect(store.filters["ws-1"].displayFilters?.group_by).toBe("priority");
    expect(set).toHaveBeenCalledWith(
      EIssuesStoreType.PROFILE,
      EIssueFilterType.DISPLAY_FILTERS,
      "ws-1",
      "ws-1",
      undefined,
      expect.objectContaining({ display_filters: expect.objectContaining({ group_by: "priority" }) })
    );
  });

  it("stores the rich filter expression locally and refetches", async () => {
    const rootStore = makeRootStore();
    const store = new WorkspaceDraftIssuesFilter(rootStore);
    const set = vi.fn();
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(() => ({})), set });

    await store.fetchFilters("ws-1");
    await store.updateFilterExpression("ws-1", "user-1", { and: ["assignee-1"] } as never);

    expect(store.filters["ws-1"].richFilters).toEqual({ and: ["assignee-1"] });
    expect(set).toHaveBeenCalledWith(EIssuesStoreType.PROFILE, EIssueFilterType.FILTERS, "ws-1", "ws-1", undefined, {
      rich_filters: { and: ["assignee-1"] },
    });
    expect(rootStore.profileIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith("ws-1", "ws-1", "mutation");
  });
});
