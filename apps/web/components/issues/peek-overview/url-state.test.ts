/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import { getPeekIssueFromSearchParams, getPeekIssueKey, updatePeekSearchParams } from "./url-state";

describe("work item peek URL state", () => {
  it("restores a peek from URL parameters", () => {
    const result = getPeekIssueFromSearchParams(
      new URLSearchParams("peekId=issue-1&peekProjectId=project-2&peekArchived=true"),
      "workspace",
      undefined
    );

    expect(result).toEqual({
      workspaceSlug: "workspace",
      projectId: "project-2",
      issueId: "issue-1",
      isArchived: true,
    });
  });

  it("uses the route project when the URL does not contain a project", () => {
    const result = getPeekIssueFromSearchParams(new URLSearchParams("peekId=issue-1"), "workspace", "project-1");

    expect(result?.projectId).toBe("project-1");
  });

  it("preserves unrelated view parameters while opening a peek", () => {
    const result = updatePeekSearchParams(new URLSearchParams("layout=list&groupBy=state"), {
      workspaceSlug: "workspace",
      projectId: "project-1",
      issueId: "issue-1",
    });

    expect(result.get("layout")).toBe("list");
    expect(result.get("groupBy")).toBe("state");
    expect(result.get("peekId")).toBe("issue-1");
    expect(result.get("peekProjectId")).toBe("project-1");
  });

  it("removes only peek parameters while closing", () => {
    const result = updatePeekSearchParams(
      new URLSearchParams("layout=kanban&peekId=issue-1&peekProjectId=project-1&peekArchived=true"),
      undefined
    );

    expect(result.toString()).toBe("layout=kanban");
  });

  it("creates a stable key for navigation comparisons", () => {
    expect(
      getPeekIssueKey({
        workspaceSlug: "workspace",
        projectId: "project-1",
        issueId: "issue-1",
        isArchived: true,
      })
    ).toBe("project-1:issue-1:archived");
    expect(getPeekIssueKey(undefined)).toBeUndefined();
  });
});
