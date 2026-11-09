/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { BaseIssueModuleStore } from "./base-issues-module.store";
import type { IBaseIssuesStore } from "./base-issues.types";

export { EIssueGroupedAction, ISSUE_FILTER_DEFAULT_DATA, ISSUE_GROUP_BY_KEY } from "./base-issues.types";
export type { IBaseIssuesStore, TIssueDisplayFilterOptions } from "./base-issues.types";

/**
 * Base store shared by every issue list in the app (project, cycle, module,
 * profile, workspace, view, archived and draft lists).
 *
 * The implementation is split by responsibility into the following chain, each
 * layer only depending on the one above it:
 *
 *  - {@link BaseIssuePaginationStore} observables, loaders, cursors, group counts
 *  - {@link BaseIssueSortingStore}    ordering of issue ids
 *  - {@link BaseIssueResponseStore}   API response -> grouped issue ids
 *  - {@link BaseIssueGroupingStore}   incremental grouped list mutations
 *  - {@link BaseIssueCrudStore}       create/update/delete/archive of issues
 *  - {@link BaseIssueCycleStore}      cycle membership
 *  - {@link BaseIssueModuleStore}     module membership
 *
 * Subclasses keep extending this class and only implement `fetchParentStats` and
 * `updateParentStats`.
 */
export abstract class BaseIssuesStore extends BaseIssueModuleStore implements IBaseIssuesStore {}
