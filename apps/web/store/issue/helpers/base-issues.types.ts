/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type {
  IBlockUpdateDependencyData,
  IssuePaginationOptions,
  TBulkOperationsPayload,
  TGroupedIssueCount,
  TGroupedIssues,
  TIssue,
  TIssueGroupByOptions,
  TIssueOrderByOptions,
  TIssuePaginationData,
  TIssues,
  TIssuesResponse,
  TLoader,
  TPaginationData,
  TSubGroupedIssues,
} from "@strata/types";

export type TIssueDisplayFilterOptions = Exclude<TIssueGroupByOptions, null> | "target_date";

export enum EIssueGroupedAction {
  ADD = "ADD",
  DELETE = "DELETE",
  REORDER = "REORDER",
}

/**
 * Contract every issue list store (project, cycle, module, profile, view, ...)
 * exposes to the components and to the root issue store.
 */
export interface IBaseIssuesStore {
  // observable
  loader: Record<string, TLoader>;

  groupedIssueIds: TGroupedIssues | TSubGroupedIssues | undefined; // object to store Issue Ids based on group or subgroup
  groupedIssueCount: TGroupedIssueCount; // map of groupId/subgroup and issue count of that particular group/subgroup
  issuePaginationData: TIssuePaginationData; // map of groupId/subgroup and pagination Data of that particular group/subgroup

  //actions
  removeIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  clear(shouldClearPaginationOptions?: boolean): void;
  // helper methods
  getIssueIds: (groupId?: string, subGroupId?: string) => string[] | undefined;
  issuesSortWithOrderBy(issueIds: string[], key: Partial<TIssueOrderByOptions>): string[];
  getPaginationData(groupId: string | undefined, subGroupId: string | undefined): TPaginationData | undefined;
  getIssueLoader(groupId?: string, subGroupId?: string): TLoader;
  getGroupIssueCount: (
    groupId: string | undefined,
    subGroupId: string | undefined,
    isSubGroupCumulative: boolean
  ) => number | undefined;

  addIssueToCycle: (
    workspaceSlug: string,
    projectId: string,
    cycleId: string,
    issueIds: string[],
    fetchAddedIssues?: boolean
  ) => Promise<void>;
  removeIssueFromCycle: (workspaceSlug: string, projectId: string, cycleId: string, issueId: string) => Promise<void>;
  addCycleToIssue: (workspaceSlug: string, projectId: string, cycleId: string, issueId: string) => Promise<void>;
  removeCycleFromIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;

  addIssueToList: (issueId: string) => void;
  removeIssueFromList: (issueId: string) => void;
  addIssuesToModule: (
    workspaceSlug: string,
    projectId: string,
    moduleId: string,
    issueIds: string[],
    fetchAddedIssues?: boolean
  ) => Promise<void>;
  removeIssuesFromModule: (
    workspaceSlug: string,
    projectId: string,
    moduleId: string,
    issueIds: string[]
  ) => Promise<void>;
  changeModulesInIssue(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    addModuleIds: string[],
    removeModuleIds: string[]
  ): Promise<void>;
  updateIssueDates(workspaceSlug: string, updates: IBlockUpdateDependencyData[], projectId?: string): Promise<void>;
}

// This constant maps the group by keys to the respective issue property that the key relies on
export const ISSUE_GROUP_BY_KEY: Record<TIssueDisplayFilterOptions, keyof TIssue> = {
  project: "project_id",
  state: "state_id",
  "state_detail.group": "state_id", // state_detail.group is only being used for state_group display,
  priority: "priority",
  labels: "label_ids",
  created_by: "created_by",
  assignees: "assignee_ids",
  target_date: "target_date",
  cycle: "cycle_id",
  module: "module_ids",
  team_project: "project_id",
};

export const ISSUE_FILTER_DEFAULT_DATA: Record<TIssueDisplayFilterOptions, keyof TIssue> = {
  project: "project_id",
  cycle: "cycle_id",
  module: "module_ids",
  state: "state_id",
  "state_detail.group": "state__group", // state_detail.group is only being used for state_group display,
  priority: "priority",
  labels: "label_ids",
  created_by: "created_by",
  assignees: "assignee_ids",
  target_date: "target_date",
  team_project: "project_id",
};

// This constant maps the order by keys to the respective issue property that the key relies on
export const ISSUE_ORDERBY_KEY: Record<TIssueOrderByOptions, keyof TIssue> = {
  created_at: "created_at",
  "-created_at": "created_at",
  updated_at: "updated_at",
  "-updated_at": "updated_at",
  priority: "priority",
  "-priority": "priority",
  sort_order: "sort_order",
  state__name: "state_id",
  "-state__name": "state_id",
  assignees__first_name: "assignee_ids",
  "-assignees__first_name": "assignee_ids",
  labels__name: "label_ids",
  "-labels__name": "label_ids",
  issue_module__module__name: "module_ids",
  "-issue_module__module__name": "module_ids",
  issue_cycle__cycle__name: "cycle_id",
  "-issue_cycle__cycle__name": "cycle_id",
  target_date: "target_date",
  "-target_date": "target_date",
  estimate_point__key: "estimate_point",
  "-estimate_point__key": "estimate_point",
  start_date: "start_date",
  "-start_date": "start_date",
  link_count: "link_count",
  "-link_count": "link_count",
  attachment_count: "attachment_count",
  "-attachment_count": "attachment_count",
  sub_issues_count: "sub_issues_count",
  "-sub_issues_count": "sub_issues_count",
};
