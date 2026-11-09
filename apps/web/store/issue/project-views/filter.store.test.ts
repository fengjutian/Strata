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
import { ProjectViewIssuesFilter } from "./filter.store";

const serviceMocks = vi.hoisted(() => ({
  getViewDetails: vi.fn(),
}));

vi.mock("@/services/view.service", () => ({
  ViewService: class {
    getViewDetails = (...args: unknown[]) => serviceMocks.getViewDetails(...args);
  },
}));

const makeRootStore = () =>
  ({
    viewId: "view-1",
    currentUserId: "user-1",
    projectIssues: { clear: vi.fn() },
    projectViewIssues: {
      fetchIssuesWithExistingPagination: vi.fn(),
    },
  }) as unknown as IIssueRootStore;

const makeStore = () => {
  const store = new ProjectViewIssuesFilter(makeRootStore());
  const get = vi.fn(() => ({}));
  const set = vi.fn();
  Object.assign(store.handleIssuesLocalFilters, { get, set });
  return { store, get, set };
};

describe("ProjectViewIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getViewDetails.mockResolvedValue({
      rich_filters: { and: [] },
      display_filters: { layout: "list", group_by: "state" },
      display_properties: { assignee: true },
    });
  });

  it("loads the filters from the view details and the kanban toggles locally", async () => {
    const rootStore = makeRootStore();
    const store = new ProjectViewIssuesFilter(rootStore);
    serviceMocks.getViewDetails.mockResolvedValue({
      rich_filters: { and: [] },
      display_filters: { layout: "list", group_by: "state" },
      display_properties: { assignee: true },
    });
    const get = vi.fn(() => ({ kanban_filters: { group_by: ["g1"], sub_group_by: [] } }));
    Object.assign(store.handleIssuesLocalFilters, { get, set: vi.fn() });

    await store.fetchFilters("ws", "project-1", "view-1");

    expect(serviceMocks.getViewDetails).toHaveBeenCalledWith("ws", "project-1", "view-1");
    expect(get).toHaveBeenCalledWith(EIssuesStoreType.PROJECT_VIEW, "ws", "view-1", "user-1");
    expect(store.filters["view-1"].richFilters).toEqual({ and: [] });
    expect(store.filters["view-1"].kanbanFilters?.group_by).toEqual(["g1"]);
  });

  it("updates display filters, clears the list and refetches without persisting", async () => {
    const rootStore = makeRootStore();
    const store = new ProjectViewIssuesFilter(rootStore);
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(() => ({})), set: vi.fn() });
    const set = vi.fn();
    Object.assign(store.handleIssuesLocalFilters, { set });

    await store.fetchFilters("ws", "project-1", "view-1");
    await store.updateFilters("ws", "project-1", EIssueFilterType.DISPLAY_FILTERS, { layout: "kanban" }, "view-1");
    await store.updateFilters(
      "ws",
      "project-1",
      EIssueFilterType.DISPLAY_FILTERS,
      { order_by: "-updated_at" },
      "view-1"
    );

    expect(rootStore.projectIssues.clear).toHaveBeenCalledWith(true);
    expect(rootStore.projectViewIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "view-1",
      "mutation"
    );
    expect(set).not.toHaveBeenCalled();
  });

  it("keeps the rich filter expression in memory only", async () => {
    const rootStore = makeRootStore();
    const store = new ProjectViewIssuesFilter(rootStore);
    const set = vi.fn();
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(() => ({})), set });

    await store.fetchFilters("ws", "project-1", "view-1");
    await store.updateFilterExpression("ws", "project-1", "view-1", { and: ["assignee-1"] } as never);

    expect(store.filters["view-1"].richFilters).toEqual({ and: ["assignee-1"] });
    expect(set).not.toHaveBeenCalled();
    expect(rootStore.projectViewIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "view-1",
      "mutation"
    );
  });
});
