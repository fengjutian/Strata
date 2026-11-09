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
import { CycleIssuesFilter } from "./filter.store";
import { ModuleIssuesFilter } from "../module/filter.store";

const serviceMocks = vi.hoisted(() => ({
  fetchCycleIssueFilters: vi.fn(),
  patchCycleIssueFilters: vi.fn(),
  fetchModuleIssueFilters: vi.fn(),
  patchModuleIssueFilters: vi.fn(),
}));

vi.mock("@/services/issue_filter.service", () => ({
  IssueFiltersService: class {
    fetchCycleIssueFilters = (...args: unknown[]) => serviceMocks.fetchCycleIssueFilters(...args);
    patchCycleIssueFilters = (...args: unknown[]) => serviceMocks.patchCycleIssueFilters(...args);
    fetchModuleIssueFilters = (...args: unknown[]) => serviceMocks.fetchModuleIssueFilters(...args);
    patchModuleIssueFilters = (...args: unknown[]) => serviceMocks.patchModuleIssueFilters(...args);
  },
}));

const filterResponse = {
  rich_filters: { and: [] },
  display_filters: {
    layout: "list",
    group_by: "state",
    sub_group_by: null,
    order_by: "-created_at",
    sub_issue: false,
  },
  display_properties: { assignee: true },
};

const makeRootStore = (cycleId: string | undefined = "cycle-1", moduleId: string | undefined = "module-1") =>
  ({
    cycleId,
    moduleId,
    currentUserId: "user-1",
    cycleIssues: {
      clear: vi.fn(),
      fetchIssuesWithExistingPagination: vi.fn(),
    },
    moduleIssues: {
      clear: vi.fn(),
      fetchIssuesWithExistingPagination: vi.fn(),
    },
  }) as unknown as IIssueRootStore;

const paginationOptions = { perPageCount: 2 } as never;

const stubLocalFilters = (store: { handleIssuesLocalFilters: object }) => {
  const get = vi.fn(() => ({}));
  const set = vi.fn();
  Object.assign(store.handleIssuesLocalFilters, { get, set });
  return { get, set };
};

describe("CycleIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.fetchCycleIssueFilters.mockResolvedValue(filterResponse);
    serviceMocks.patchCycleIssueFilters.mockResolvedValue({});
  });

  it("loads the filters of the current cycle and applies display defaults", async () => {
    const rootStore = makeRootStore();
    const store = new CycleIssuesFilter(rootStore);
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "cycle-1");

    expect(serviceMocks.fetchCycleIssueFilters).toHaveBeenCalledWith("ws", "project-1", "cycle-1");
    expect(store.filters["cycle-1"].richFilters).toEqual({ and: [] });
    expect(store.filters["cycle-1"].displayFilters?.group_by).toBe("state");
    expect(store.filters["cycle-1"].displayProperties?.assignee).toBe(true);
  });

  it("derives the route params with the cycle scope and the pagination cursor", async () => {
    const store = new CycleIssuesFilter(makeRootStore());
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "cycle-1");
    const params = store.getFilterParams(paginationOptions, "cycle-1", undefined, undefined, undefined);

    expect(params.cycle).toBe("cycle-1");
    expect(params.cursor).toBe("2:0:0");
    expect(params.per_page).toBe("2");
    expect(params.layout).toBe("list");
  });

  it("exposes issueFilters only while the route has a cycle", async () => {
    const store = new CycleIssuesFilter(makeRootStore());
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "cycle-1");
    expect(store.issueFilters).toBeDefined();

    const withoutCycle = new CycleIssuesFilter(makeRootStore(undefined));
    expect(withoutCycle.issueFilters).toBeUndefined();
  });

  it("patches display filters and refetches when a server side filter changes", async () => {
    const rootStore = makeRootStore();
    const store = new CycleIssuesFilter(rootStore);
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "cycle-1");
    await store.updateFilters(
      "ws",
      "project-1",
      EIssueFilterType.DISPLAY_FILTERS,
      { order_by: "-updated_at" },
      "cycle-1"
    );

    expect(store.filters["cycle-1"].displayFilters?.order_by).toBe("-updated_at");
    expect(serviceMocks.patchCycleIssueFilters).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "cycle-1",
      expect.objectContaining({ display_filters: expect.objectContaining({ order_by: "-updated_at" }) })
    );
    expect(rootStore.cycleIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "mutation",
      "cycle-1"
    );
  });

  it("clears the local issue list when the layout changes", async () => {
    const rootStore = makeRootStore();
    const store = new CycleIssuesFilter(rootStore);
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "cycle-1");
    await store.updateFilters("ws", "project-1", EIssueFilterType.DISPLAY_FILTERS, { layout: "kanban" }, "cycle-1");

    expect(rootStore.cycleIssues.clear).toHaveBeenCalledWith(true);
  });

  it("patches display properties and kanban filters", async () => {
    const rootStore = makeRootStore();
    const store = new CycleIssuesFilter(rootStore);
    const local = stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "cycle-1");

    await store.updateFilters("ws", "project-1", EIssueFilterType.DISPLAY_PROPERTIES, { assignee: false }, "cycle-1");
    expect(serviceMocks.patchCycleIssueFilters).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "cycle-1",
      expect.objectContaining({ display_properties: expect.objectContaining({ assignee: false }) })
    );

    await store.updateFilters(
      "ws",
      "project-1",
      EIssueFilterType.KANBAN_FILTERS,
      { group_by: ["state-1"], sub_group_by: [] },
      "cycle-1"
    );
    expect(local.set).toHaveBeenCalledWith(
      EIssuesStoreType.CYCLE,
      EIssueFilterType.KANBAN_FILTERS,
      "ws",
      "cycle-1",
      "user-1",
      expect.objectContaining({ kanban_filters: expect.objectContaining({ group_by: ["state-1"] }) })
    );
  });

  it("stores a rich filter expression and asks the list for a refetch", async () => {
    const rootStore = makeRootStore();
    const store = new CycleIssuesFilter(rootStore);
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "cycle-1");
    await store.updateFilterExpression("ws", "project-1", "cycle-1", { and: ["assignee-1"] } as never);

    expect(store.filters["cycle-1"].richFilters).toEqual({ and: ["assignee-1"] });
    expect(rootStore.cycleIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "mutation",
      "cycle-1"
    );
    expect(serviceMocks.patchCycleIssueFilters).toHaveBeenCalledWith("ws", "project-1", "cycle-1", {
      rich_filters: { and: ["assignee-1"] },
    });
  });
});

describe("ModuleIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.fetchModuleIssueFilters.mockResolvedValue(filterResponse);
    serviceMocks.patchModuleIssueFilters.mockResolvedValue({});
  });

  it("uses the module scope for params and local filter storage", async () => {
    const rootStore = makeRootStore();
    const store = new ModuleIssuesFilter(rootStore);
    const local = stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1", "module-1");
    const params = store.getFilterParams(paginationOptions, "module-1", undefined, undefined, undefined);

    expect(params.module).toBe("module-1");
    expect(serviceMocks.fetchModuleIssueFilters).toHaveBeenCalledWith("ws", "project-1", "module-1");

    await store.updateFilters(
      "ws",
      "project-1",
      EIssueFilterType.KANBAN_FILTERS,
      { group_by: [], sub_group_by: [] },
      "module-1"
    );

    expect(local.set).toHaveBeenCalledWith(
      EIssuesStoreType.MODULE,
      EIssueFilterType.KANBAN_FILTERS,
      "ws",
      "module-1",
      "user-1",
      expect.anything()
    );
  });
});
