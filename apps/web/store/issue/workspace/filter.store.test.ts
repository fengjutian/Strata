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
import { WorkspaceIssuesFilter } from "./filter.store";

const serviceMocks = vi.hoisted(() => ({
  getViewDetails: vi.fn(),
}));

vi.mock("@/services/workspace.service", () => ({
  WorkspaceService: class {
    getViewDetails = (...args: unknown[]) => serviceMocks.getViewDetails(...args);
  },
}));

const makeRootStore = () =>
  ({
    globalViewId: "assigned",
    currentUserId: "user-1",
    workspaceIssues: {
      fetchIssuesWithExistingPagination: vi.fn(),
    },
  }) as unknown as IIssueRootStore;

const makeStore = () => {
  const store = new WorkspaceIssuesFilter(makeRootStore());
  const get = vi.fn(() => ({}));
  const set = vi.fn();
  Object.assign(store.handleIssuesLocalFilters, { get, set });
  return { store, get, set };
};

describe("WorkspaceIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getViewDetails.mockResolvedValue({});
  });

  it("loads a static view from local storage and normalises the manual sort order", async () => {
    const { store, get } = makeStore();
    get.mockReturnValue({
      display_filters: { layout: "spreadsheet", group_by: "state", order_by: "sort_order" },
      display_properties: { assignee: true },
      kanban_filters: { group_by: [], sub_group_by: [] },
    });

    await store.fetchFilters("ws", "assigned");

    expect(get).toHaveBeenCalledWith(EIssuesStoreType.GLOBAL, "ws", undefined, "assigned");
    expect(store.filters["assigned"].displayFilters?.order_by).toBe("-created_at");
    expect(serviceMocks.getViewDetails).not.toHaveBeenCalled();
  });

  it("adds the static view condition to the query params", async () => {
    const { store } = makeStore();

    await store.fetchFilters("ws", "assigned");
    const params = store.getFilterParams({ perPageCount: 50 } as never, "assigned", undefined, undefined, undefined);

    expect(params.assignees).toBe("user-1");
    expect(params.layout).toBe("spreadsheet");
    expect(params.per_page).toBe("50");
  });

  it("loads a custom view from the view details", async () => {
    const { store } = makeStore();
    serviceMocks.getViewDetails.mockResolvedValue({
      rich_filters: { and: [] },
      display_filters: { layout: "kanban", group_by: "state" },
      display_properties: { assignee: true },
    });

    await store.fetchFilters("ws", "view-1");

    expect(serviceMocks.getViewDetails).toHaveBeenCalledWith("ws", "view-1");
    expect(store.filters["view-1"].richFilters).toEqual({ and: [] });
    expect(store.filters["view-1"].displayFilters?.layout).toBe("kanban");
  });

  it("does not persist display changes for a custom view", async () => {
    const { store, set } = makeStore();
    serviceMocks.getViewDetails.mockResolvedValue({
      rich_filters: { and: [] },
      display_filters: { layout: "list", group_by: "state" },
      display_properties: {},
    });

    await store.fetchFilters("ws", "view-1");
    await store.updateFilters(
      "ws",
      "project-1",
      EIssueFilterType.DISPLAY_FILTERS,
      { order_by: "-updated_at" },
      "view-1"
    );

    expect(set).not.toHaveBeenCalled();
    expect(store.filters["view-1"].displayFilters?.order_by).toBe("-updated_at");
  });

  it("persists display changes for a static view", async () => {
    const { store, set } = makeStore();

    await store.fetchFilters("ws", "assigned");
    await store.updateFilters("ws", undefined, EIssueFilterType.DISPLAY_PROPERTIES, { assignee: false }, "assigned");

    expect(set).toHaveBeenCalledWith(
      EIssuesStoreType.GLOBAL,
      EIssueFilterType.DISPLAY_PROPERTIES,
      "ws",
      undefined,
      "assigned",
      expect.objectContaining({ display_properties: expect.objectContaining({ assignee: false }) })
    );
  });

  it("keeps the rich filter expression in memory only", async () => {
    const rootStore = makeRootStore();
    const store = new WorkspaceIssuesFilter(rootStore);
    const set = vi.fn();
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(() => ({})), set });

    await store.fetchFilters("ws", "assigned");
    await store.updateFilterExpression("ws", "assigned", { and: ["assignee-1"] } as never);

    expect(store.filters["assigned"].richFilters).toEqual({ and: ["assignee-1"] });
    expect(set).not.toHaveBeenCalled();
    expect(rootStore.workspaceIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "assigned",
      "mutation"
    );
  });
});
