/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
// strata constants
import { EIssueFilterType } from "@strata/constants";
//
import type { IIssueRootStore } from "../root.store";
import { ProjectIssuesFilter } from "./filter.store";

const projectServiceMocks = vi.hoisted(() => ({
  getProjectUserProperties: vi.fn(),
  updateProjectUserProperties: vi.fn(),
}));

vi.mock("@/services/project", () => ({
  ProjectService: class {
    getProjectUserProperties = (...args: unknown[]) => projectServiceMocks.getProjectUserProperties(...args);
    updateProjectUserProperties = (...args: unknown[]) => projectServiceMocks.updateProjectUserProperties(...args);
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

const makeRootStore = (projectId: string | undefined = "project-1") =>
  ({
    projectId,
    currentUserId: "user-1",
    projectIssues: {
      clear: vi.fn(),
      fetchIssuesWithExistingPagination: vi.fn(),
    },
  }) as unknown as IIssueRootStore;

const paginationOptions = { perPageCount: 10 } as never;

const stubLocalFilters = (store: { handleIssuesLocalFilters: object }) => {
  const get = vi.fn(() => ({}));
  const set = vi.fn();
  Object.assign(store.handleIssuesLocalFilters, { get, set });
  return { get, set };
};

describe("ProjectIssuesFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectServiceMocks.getProjectUserProperties.mockResolvedValue(filterResponse);
    projectServiceMocks.updateProjectUserProperties.mockResolvedValue({});
  });

  it("loads the project filters through the project service", async () => {
    const store = new ProjectIssuesFilter(makeRootStore());
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1");

    expect(projectServiceMocks.getProjectUserProperties).toHaveBeenCalledWith("ws", "project-1");
    expect(store.filters["project-1"].richFilters).toEqual({ and: [] });
    expect(store.filters["project-1"].displayFilters?.group_by).toBe("state");
  });

  it("does not add a scope query param but keeps the pagination params", async () => {
    const store = new ProjectIssuesFilter(makeRootStore());
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1");
    const params = store.getFilterParams(paginationOptions, "project-1", undefined, undefined, undefined);

    expect(params).not.toHaveProperty("project");
    expect(params.cursor).toBe("10:0:0");
    expect(params.per_page).toBe("10");
    expect(params.layout).toBe("list");
  });

  it("patches display filters and refetches the project list", async () => {
    const rootStore = makeRootStore();
    const store = new ProjectIssuesFilter(rootStore);
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1");
    await store.updateFilters("ws", "project-1", EIssueFilterType.DISPLAY_FILTERS, { order_by: "-updated_at" });

    expect(store.filters["project-1"].displayFilters?.order_by).toBe("-updated_at");
    expect(projectServiceMocks.updateProjectUserProperties).toHaveBeenCalledWith(
      "ws",
      "project-1",
      expect.objectContaining({ display_filters: expect.objectContaining({ order_by: "-updated_at" }) })
    );
    expect(rootStore.projectIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "mutation"
    );
  });

  it("accepts the scope-less rich filter expression signature", async () => {
    const rootStore = makeRootStore();
    const store = new ProjectIssuesFilter(rootStore);
    stubLocalFilters(store);

    await store.fetchFilters("ws", "project-1");
    await store.updateFilterExpression("ws", "project-1", { and: ["assignee-1"] } as never);

    expect(store.filters["project-1"].richFilters).toEqual({ and: ["assignee-1"] });
    expect(projectServiceMocks.updateProjectUserProperties).toHaveBeenCalledWith("ws", "project-1", {
      rich_filters: { and: ["assignee-1"] },
    });
    expect(rootStore.projectIssues.fetchIssuesWithExistingPagination).toHaveBeenCalledWith(
      "ws",
      "project-1",
      "mutation"
    );
  });
});
