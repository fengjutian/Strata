/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
// strata constants
import { EIssueFilterType } from "@strata/constants";
// types
import { EIssuesStoreType } from "@strata/types";
import type { IIssueRootStore } from "../root.store";
import { ArchivedIssuesFilter } from "./filter.store";

const makeRootStore = (projectId: string | undefined = "project-1") =>
  ({
    projectId,
    currentUserId: "user-1",
    archivedIssues: {
      fetchIssuesWithExistingPagination: vi.fn(),
    },
  }) as unknown as IIssueRootStore;

const makeStore = () => {
  const store = new ArchivedIssuesFilter(makeRootStore());
  const get = vi.fn();
  const set = vi.fn();
  Object.assign(store.handleIssuesLocalFilters, { get, set });
  return { store, get, set };
};

describe("ArchivedIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the archived filters from the local filter storage", async () => {
    const { store, get } = makeStore();
    get.mockReturnValue({
      richFilters: { and: [] },
      display_filters: { layout: "list", group_by: "state", sub_issue: false },
      display_properties: { assignee: true },
      kanban_filters: { group_by: ["g1"], sub_group_by: [] },
    });

    await store.fetchFilters("ws", "project-1");

    expect(get).toHaveBeenCalledWith(EIssuesStoreType.ARCHIVED, "ws", "project-1", undefined);
    expect(store.filters["project-1"].displayFilters?.sub_issue).toBe(true);
    expect(store.filters["project-1"].kanbanFilters?.group_by).toEqual(["g1"]);
  });

  it("persists display filters locally and refetches the archived list", async () => {
    const rootStore = makeRootStore();
    const store = new ArchivedIssuesFilter(rootStore);
    const set = vi.fn();
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(), set });
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(() => ({})) });

    await store.fetchFilters("ws", "project-1");
    await store.updateFilters("ws", "project-1", EIssueFilterType.DISPLAY_FILTERS, { order_by: "-updated_at" });

    expect(store.filters["project-1"].displayFilters?.order_by).toBe("-updated_at");
    expect(set).toHaveBeenCalledWith(
      EIssuesStoreType.ARCHIVED,
      EIssueFilterType.DISPLAY_FILTERS,
      "ws",
      "project-1",
      undefined,
      expect.objectContaining({ display_filters: expect.objectContaining({ order_by: "-updated_at" }) })
    );
    expect(rootStore.archivedIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "mutation"
    );
  });

  it("stores a rich filter expression locally", async () => {
    const { store, set } = makeStore();

    await store.fetchFilters("ws", "project-1");
    await store.updateFilterExpression("ws", "project-1", { and: ["assignee-1"] } as never);

    expect(store.filters["project-1"].richFilters).toEqual({ and: ["assignee-1"] });
    expect(set).toHaveBeenCalledWith(
      EIssuesStoreType.ARCHIVED,
      EIssueFilterType.FILTERS,
      "ws",
      "project-1",
      undefined,
      { rich_filters: { and: ["assignee-1"] } }
    );
  });

  it("defaults kanban grouping to state when the layout changes without a group", async () => {
    const { store } = makeStore();
    Object.assign(store.handleIssuesLocalFilters, { get: vi.fn(() => ({})) });

    await store.fetchFilters("ws", "project-1");
    await store.updateFilters("ws", "project-1", EIssueFilterType.DISPLAY_FILTERS, {
      layout: "kanban",
      group_by: null,
    } as never);

    expect(store.filters["project-1"].displayFilters?.group_by).toBe("state");
  });
});
