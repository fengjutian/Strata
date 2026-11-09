/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { EIssueServiceType } from "@strata/types";
import { IssueService } from "./issue.service";

// The service extends APIService, which owns the axios instance. Mock the
// base class so the tests observe the exact URL and payload the service
// builds, without any network access.
const httpMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/services/api.service", () => ({
  APIService: class {
    get = (...args: unknown[]) => httpMocks.get(...args);
    post = (...args: unknown[]) => httpMocks.post(...args);
    put = (...args: unknown[]) => httpMocks.put(...args);
    patch = (...args: unknown[]) => httpMocks.patch(...args);
    delete = (...args: unknown[]) => httpMocks.delete(...args);
  },
}));

const ok = (data: unknown) => Promise.resolve({ data });

describe("IssueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpMocks.get.mockImplementation(ok);
    httpMocks.post.mockImplementation(ok);
    httpMocks.delete.mockImplementation(ok);
  });

  describe("URL construction", () => {
    it("builds the issue list URL from the service type", async () => {
      const service = new IssueService();
      await service.getIssues("ws-1", "proj-1", {});
      expect(httpMocks.get).toHaveBeenCalledWith(
        "/api/workspaces/ws-1/projects/proj-1/issues/",
        { params: {} },
        {}
      );
    });

    it("uses the epic service type in the URL when constructed with epics", async () => {
      const service = new IssueService(EIssueServiceType.EPICS);
      await service.getIssues("ws-1", "proj-1", {});
      expect(httpMocks.get).toHaveBeenCalledWith(
        "/api/workspaces/ws-1/projects/proj-1/epics/",
        { params: {} },
        {}
      );
    });

    it("switches to the detail endpoint when expanding issue_relation without group_by", async () => {
      const service = new IssueService();
      await service.getIssuesFromServer("ws-1", "proj-1", { expand: "issue_relation" });
      expect(httpMocks.get).toHaveBeenCalledWith(
        "/api/workspaces/ws-1/projects/proj-1/issues-detail/",
        { params: { expand: "issue_relation" } },
        {}
      );
    });

    it("keeps the plain endpoint when group_by is present alongside the expand", async () => {
      const service = new IssueService();
      await service.getIssuesFromServer("ws-1", "proj-1", { expand: "issue_relation", group_by: "state" });
      expect(httpMocks.get).toHaveBeenCalledWith(
        "/api/workspaces/ws-1/projects/proj-1/issues/",
        { params: { expand: "issue_relation", group_by: "state" } },
        {}
      );
    });

    it("joins issue ids with a comma for the list endpoint", async () => {
      const service = new IssueService();
      await service.retrieveIssues("ws-1", "proj-1", ["a", "b", "c"]);
      expect(httpMocks.get).toHaveBeenCalledWith(
        "/api/workspaces/ws-1/projects/proj-1/issues/list/",
        { params: { issues: "a,b,c" } }
      );
    });

    it("builds the relation URL with the relation id", async () => {
      const service = new IssueService();
      await service.deleteIssueRelation("ws-1", "proj-1", "issue-1", "rel-1");
      expect(httpMocks.delete).toHaveBeenCalledWith(
        "/api/workspaces/ws-1/projects/proj-1/issues/issue-1/issue-relation/rel-1/"
      );
    });
  });

  describe("response handling", () => {
    it("returns the response body for createIssue", async () => {
      httpMocks.post.mockResolvedValue({ data: { id: "issue-1" } });
      const service = new IssueService();
      await expect(service.createIssue("ws-1", "proj-1", { name: "Bug" })).resolves.toEqual({ id: "issue-1" });
    });

    it("marks a retrieved epic with is_epic", async () => {
      httpMocks.get.mockResolvedValue({ data: { id: "epic-1" } });
      const service = new IssueService(EIssueServiceType.EPICS);
      const result = await service.retrieve("ws-1", "proj-1", "epic-1");
      expect(result).toHaveProperty("is_epic", true);
    });

    it("does not set is_epic for a regular issue", async () => {
      httpMocks.get.mockResolvedValue({ data: { id: "issue-1" } });
      const service = new IssueService();
      const result = await service.retrieve("ws-1", "proj-1", "issue-1");
      expect(result).not.toHaveProperty("is_epic");
    });
  });

  describe("error propagation", () => {
    it("throws the server error body on a failed request", async () => {
      httpMocks.get.mockRejectedValue({ response: { data: { error: "Not found" } } });
      const service = new IssueService();
      await expect(service.getIssues("ws-1", "proj-1", {})).rejects.toEqual({ error: "Not found" });
    });

    it("throws the raw response for createIssueRelation, not just its body", async () => {
      const raw = { response: { data: { error: "Conflict" } } };
      httpMocks.post.mockRejectedValue(raw);
      const service = new IssueService();
      await expect(
        service.createIssueRelation("ws-1", "proj-1", "issue-1", {
          related_list: [{ relation_type: "relates_to", related_issue: "issue-2" }],
        })
      ).rejects.toEqual(raw.response);
    });
  });
});
