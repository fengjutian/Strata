/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TPeekIssue } from "@/store/issue/issue-details/root.store";

const PEEK_ID_PARAM = "peekId";
const PEEK_PROJECT_ID_PARAM = "peekProjectId";
const PEEK_ARCHIVED_PARAM = "peekArchived";

export const getPeekIssueFromSearchParams = (
  searchParams: URLSearchParams,
  workspaceSlug: string | undefined,
  routeProjectId: string | undefined
): TPeekIssue | undefined => {
  const issueId = searchParams.get(PEEK_ID_PARAM);
  const projectId = searchParams.get(PEEK_PROJECT_ID_PARAM) ?? routeProjectId;

  if (!workspaceSlug || !projectId || !issueId) return undefined;

  return {
    workspaceSlug,
    projectId,
    issueId,
    isArchived: searchParams.get(PEEK_ARCHIVED_PARAM) === "true",
  };
};

export const updatePeekSearchParams = (
  currentSearchParams: URLSearchParams,
  peekIssue: TPeekIssue | undefined
): URLSearchParams => {
  const nextSearchParams = new URLSearchParams(currentSearchParams);

  if (!peekIssue) {
    nextSearchParams.delete(PEEK_ID_PARAM);
    nextSearchParams.delete(PEEK_PROJECT_ID_PARAM);
    nextSearchParams.delete(PEEK_ARCHIVED_PARAM);
    return nextSearchParams;
  }

  nextSearchParams.set(PEEK_ID_PARAM, peekIssue.issueId);
  nextSearchParams.set(PEEK_PROJECT_ID_PARAM, peekIssue.projectId);
  if (peekIssue.isArchived) nextSearchParams.set(PEEK_ARCHIVED_PARAM, "true");
  else nextSearchParams.delete(PEEK_ARCHIVED_PARAM);

  return nextSearchParams;
};

export const arePeekSearchParamsEqual = (searchParams: URLSearchParams, peekIssue: TPeekIssue | undefined) => {
  const nextSearchParams = updatePeekSearchParams(searchParams, peekIssue);
  return nextSearchParams.toString() === searchParams.toString();
};

export const getPeekIssueKey = (peekIssue: TPeekIssue | undefined) =>
  peekIssue ? `${peekIssue.projectId}:${peekIssue.issueId}:${peekIssue.isArchived ? "archived" : "active"}` : undefined;
