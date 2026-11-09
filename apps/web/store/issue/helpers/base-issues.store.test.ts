/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it, vi } from "vitest";
// strata constants
import { ALL_ISSUES } from "@strata/constants";
// types
import type { IIssueDisplayFilterOptions, IssuePaginationOptions, TIssue, TIssuesResponse } from "@strata/types";
import { EIssueLayoutTypes, EIssueServiceType } from "@strata/types";
//
import type { IIssueRootStore } from "../root.store";
import { BaseIssuesStore } from "./base-issues.store";
import { EIssueGroupedAction } from "./base-issues.types";
import type { IBaseIssueFilterStore } from "./issue-filter-helper.store";

class TestIssuesStore extends BaseIssuesStore {
  fetchParentStats = () => {};

  updateParentStats = () => {};
}

const makeIssue = (id: string, overrides: Partial<TIssue> = {}): TIssue =>
  ({ id, created_at: "2026-01-01T00:00:00Z", ...overrides }) as TIssue;

const makeDisplayFilters = (
  overrides: Partial<IIssueDisplayFilterOptions> = {}
): Partial<IIssueDisplayFilterOptions> => ({
  layout: EIssueLayoutTypes.LIST,
  group_by: null,
  sub_group_by: null,
  order_by: "-created_at",
  ...overrides,
});

interface SetupOptions {
  displayFilters?: Partial<IIssueDisplayFilterOptions>;
  issues?: TIssue[];
  cycleId?: string;
  moduleId?: string;
}

function setup({ displayFilters, issues = [], cycleId, moduleId }: SetupOptions = {}) {
  const issuesMap: Record<string, TIssue> = {};
  issues.forEach((issue) => {
    issuesMap[issue.id] = issue;
  });

  const addIssue = (list: TIssue[]) => {
    list.forEach((issue) => {
      issuesMap[issue.id] = { ...issuesMap[issue.id], ...issue };
    });
  };

  const rootStore = {
    cycleId,
    moduleId,
    issuesMap,
    issues: {
      issuesMap,
      addIssue,
      updateIssue: (issueId: string, data: Partial<TIssue>) => {
        issuesMap[issueId] = { ...issuesMap[issueId], ...data } as TIssue;
      },
      removeIssue: (issueId: string) => {
        delete issuesMap[issueId];
      },
      getIssueById: (issueId: string) => issuesMap[issueId],
      getIssuesByIds: (issueIds: string[]) => issueIds.map((issueId) => issuesMap[issueId]).filter(Boolean),
      getIssues: async () => {},
    },
    issueDetail: {
      relation: {
        extractRelationsFromIssues: () => {},
      },
    },
    rootStore: {
      state: { stateMap: {} },
      projectEstimate: {
        currentActiveEstimateIdByProjectId: () => undefined,
        estimateById: () => undefined,
      },
    },
  } as unknown as IIssueRootStore;

  const filterStore = {
    issueFilters: {
      displayFilters: makeDisplayFilters(displayFilters),
      richFilters: {},
    },
  } as unknown as IBaseIssueFilterStore;

  const store = new TestIssuesStore(rootStore, filterStore, false, EIssueServiceType.ISSUES);

  return { store, issuesMap, filterStore };
}

const makeResponse = (overrides: Partial<TIssuesResponse> = {}): TIssuesResponse =>
  ({
    results: [],
    total_count: 0,
    next_cursor: "50:1:0",
    prev_cursor: "50:0:0",
    next_page_results: true,
    ...overrides,
  }) as unknown as TIssuesResponse;

const makePaginationOptions = (perPageCount = 50): IssuePaginationOptions =>
  ({ perPageCount, groupBy: undefined, subGroupBy: undefined }) as unknown as IssuePaginationOptions;

describe("BaseIssuesStore", () => {
  it("stores an ungrouped response under ALL_ISSUES and records the cursor", () => {
    const { store } = setup();
    const issues = [makeIssue("i1"), makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })];

    store.onfetchIssues(makeResponse({ results: issues, total_count: 2 }), makePaginationOptions(), "ws", "project-1");

    expect(store.getIssueIds()).toEqual(["i2", "i1"]);
    expect(store.groupedIssueCount[ALL_ISSUES]).toBe(2);
    expect(store.getPaginationData(undefined, undefined)?.nextCursor).toBe("50:1:0");
    expect(store.getIssueLoader()).toBeUndefined();
  });

  it("buckets a grouped response per group and per group count", () => {
    const { store } = setup({ displayFilters: { group_by: "state" } });
    const issues = [
      makeIssue("i1", { state_id: "state-1" }),
      makeIssue("i2", { state_id: "state-1", created_at: "2026-01-02T00:00:00Z" }),
      makeIssue("i3", { state_id: "state-2", created_at: "2026-01-03T00:00:00Z" }),
    ];

    store.onfetchIssues(
      makeResponse({
        results: {
          "state-1": { results: [issues[1], issues[0]], total_results: 2 },
          "state-2": { results: [issues[2]], total_results: 1 },
        },
        total_count: 3,
      } as unknown as Partial<TIssuesResponse>),
      makePaginationOptions(),
      "ws",
      "project-1"
    );

    expect(store.getIssueIds("state-1")).toEqual(["i2", "i1"]);
    expect(store.getIssueIds("state-2")).toEqual(["i3"]);
    expect(store.groupedIssueCount["state-1"]).toBe(2);
    expect(store.groupedIssueCount["state-2"]).toBe(1);
    expect(store.groupedIssueCount[ALL_ISSUES]).toBe(3);
  });

  it("appends a newly created issue to its group and increments the counts", () => {
    const { store, issuesMap } = setup({ displayFilters: { group_by: "state" } });
    const issues = [
      makeIssue("i1", { state_id: "state-1" }),
      makeIssue("i2", { state_id: "state-2", created_at: "2026-01-02T00:00:00Z" }),
    ];

    store.onfetchIssues(
      makeResponse({
        results: {
          "state-1": { results: [issues[0]], total_results: 1 },
          "state-2": { results: [issues[1]], total_results: 1 },
        },
        total_count: 2,
      } as unknown as Partial<TIssuesResponse>),
      makePaginationOptions(),
      "ws",
      "project-1"
    );

    issuesMap.i3 = makeIssue("i3", { state_id: "state-2", created_at: "2026-01-03T00:00:00Z" });
    store.addIssueToList("i3");

    expect(store.getIssueIds("state-2")).toEqual(["i3", "i2"]);
    expect(store.groupedIssueCount["state-2"]).toBe(2);
    expect(store.groupedIssueCount[ALL_ISSUES]).toBe(3);
  });

  it("removes an issue from its group and decrements the counts", () => {
    const { store } = setup({ displayFilters: { group_by: "state" } });
    const issues = [
      makeIssue("i1", { state_id: "state-1" }),
      makeIssue("i2", { state_id: "state-2", created_at: "2026-01-02T00:00:00Z" }),
    ];

    store.onfetchIssues(
      makeResponse({
        results: {
          "state-1": { results: [issues[0]], total_results: 1 },
          "state-2": { results: [issues[1]], total_results: 1 },
        },
        total_count: 2,
      } as unknown as Partial<TIssuesResponse>),
      makePaginationOptions(),
      "ws",
      "project-1"
    );

    store.removeIssueFromList("i2");

    expect(store.getIssueIds("state-2")).toEqual([]);
    expect(store.groupedIssueCount["state-2"]).toBe(0);
    expect(store.groupedIssueCount[ALL_ISSUES]).toBe(1);
  });

  it("derives add/delete paths when a grouped issue changes group", () => {
    const { store } = setup({ displayFilters: { group_by: "state" } });
    const before = makeIssue("i1", { state_id: "state-1" });
    const after = makeIssue("i1", { state_id: "state-2" });

    expect(store.getUpdateDetails(after, before)).toEqual([
      { path: ["state-2"], action: EIssueGroupedAction.ADD },
      { path: ["state-1"], action: EIssueGroupedAction.DELETE },
    ]);
  });

  it("computes the next cursor from the number of loaded issues", () => {
    const { store } = setup();
    const issues = [makeIssue("i1"), makeIssue("i2"), makeIssue("i3", { created_at: "2026-01-03T00:00:00Z" })];

    store.onfetchIssues(makeResponse({ results: issues, total_count: 3 }), makePaginationOptions(2), "ws", "project-1");

    expect(store.getNextCursor(undefined, undefined)).toBe("2:1:0");
  });

  it("clears the grouped state and the stored pagination options", () => {
    const { store } = setup();
    const issues = [makeIssue("i1"), makeIssue("i2", { created_at: "2026-01-02T00:00:00Z" })];

    store.onfetchIssues(makeResponse({ results: issues, total_count: 2 }), makePaginationOptions(), "ws", "project-1");
    store.clear();

    expect(store.groupedIssueIds).toBeUndefined();
    expect(store.groupedIssueCount).toEqual({});
    expect(store.paginationOptions).toBeUndefined();
    expect(store.getIssueIds()).toBeUndefined();
  });

  it("exposes the filter derived group/order keys", () => {
    const { store } = setup({ displayFilters: { group_by: "state", order_by: "-priority" } });

    expect(store.groupBy).toBe("state");
    expect(store.issueGroupKey).toBe("state_id");
    expect(store.orderByKey).toBe("priority");
  });

  it("adds issues to the current cycle and stamps their cycle_id", async () => {
    const { store, issuesMap } = setup({ cycleId: "cycle-1" });
    issuesMap.i1 = makeIssue("i1", { cycle_id: null });
    const addIssueToCycle = vi.fn(async () => ({}));
    store.issueService.addIssueToCycle = addIssueToCycle;

    await store.addIssueToCycle("ws", "project-1", "cycle-1", ["i1"], false);

    expect(addIssueToCycle).toHaveBeenCalledWith("ws", "project-1", "cycle-1", { issues: ["i1"] });
    expect(store.getIssueIds()).toEqual(["i1"]);
    expect(issuesMap.i1.cycle_id).toBe("cycle-1");
  });

  it("removes an issue from the current cycle and clears its cycle_id", async () => {
    const { store, issuesMap } = setup({ cycleId: "cycle-1" });
    issuesMap.i1 = makeIssue("i1", { cycle_id: "cycle-1" });
    store.addIssueToList("i1");
    store.issueService.removeIssueFromCycle = vi.fn(async () => ({}));

    await store.removeIssueFromCycle("ws", "project-1", "cycle-1", "i1");

    expect(store.getIssueIds()).toEqual([]);
    expect(issuesMap.i1.cycle_id).toBeNull();
  });

  it("moves an issue into the current cycle when a cycle is set on it", async () => {
    const { store, issuesMap } = setup({ cycleId: "cycle-2" });
    issuesMap.i1 = makeIssue("i1", { cycle_id: "cycle-1" });
    store.issueService.addIssueToCycle = vi.fn(async () => ({}));

    await store.addCycleToIssue("ws", "project-1", "cycle-2", "i1");

    expect(store.getIssueIds()).toEqual(["i1"]);
    expect(issuesMap.i1.cycle_id).toBe("cycle-2");
  });

  it("adds a module to an issue and to the current module list", async () => {
    const { store, issuesMap } = setup({ moduleId: "module-1" });
    issuesMap.i1 = makeIssue("i1", { module_ids: [] });
    store.moduleService.addModulesToIssue = vi.fn(async () => {});

    await store.changeModulesInIssue("ws", "project-1", "i1", ["module-1"], []);

    expect(issuesMap.i1.module_ids).toEqual(["module-1"]);
    expect(store.getIssueIds()).toEqual(["i1"]);
  });

  it("removes a module from an issue and from the current module list", async () => {
    const { store, issuesMap } = setup({ moduleId: "module-1" });
    issuesMap.i1 = makeIssue("i1", { module_ids: ["module-1"] });
    store.addIssueToList("i1");
    store.moduleService.removeIssuesFromModuleBulk = vi.fn(async () => {});

    await store.removeIssuesFromModule("ws", "project-1", "module-1", ["i1"]);

    expect(store.getIssueIds()).toEqual([]);
    expect(issuesMap.i1.module_ids).toEqual([]);
  });

  it("creates an issue, stores it and appends it to the list", async () => {
    const { store } = setup();
    store.issueService.createIssue = vi.fn(async () => makeIssue("i2", { name: "new issue" }));

    const created = await store.createIssue("ws", "project-1", { name: "new issue" });

    expect(created.id).toBe("i2");
    expect(store.getIssueIds()).toEqual(["i2"]);
  });

  it("updates an issue optimistically and rolls back when the API fails", async () => {
    const { store, issuesMap } = setup();
    issuesMap.i1 = makeIssue("i1", { name: "old name" });
    store.addIssueToList("i1");
    store.issueService.patchIssue = vi.fn(async () => {
      throw new Error("patch failed");
    });

    await expect(store.issueUpdate("ws", "project-1", "i1", { name: "new name" })).rejects.toThrow("patch failed");

    expect(issuesMap.i1.name).toBe("old name");
  });

  it("removes an issue from the store and the list", async () => {
    const { store, issuesMap } = setup();
    issuesMap.i1 = makeIssue("i1");
    store.addIssueToList("i1");
    store.issueService.deleteIssue = vi.fn(async () => {});

    await store.removeIssue("ws", "project-1", "i1");

    expect(store.getIssueIds()).toEqual([]);
    expect(issuesMap.i1).toBeUndefined();
  });

  it("bulk archives issues, stamps archived_at and drops them from the list", async () => {
    const { store, issuesMap } = setup();
    issuesMap.i1 = makeIssue("i1");
    issuesMap.i2 = makeIssue("i2");
    store.addIssueToList("i1");
    store.addIssueToList("i2");
    store.issueService.bulkArchiveIssues = vi.fn(async () => ({ archived_at: "2026-02-01T00:00:00Z" }));

    await store.bulkArchiveIssues("ws", "project-1", ["i1", "i2"]);

    expect(store.getIssueIds()).toEqual([]);
    expect(issuesMap.i1.archived_at).toBe("2026-02-01T00:00:00Z");
    expect(issuesMap.i2.archived_at).toBe("2026-02-01T00:00:00Z");
  });
});
