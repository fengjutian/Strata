/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { indexOf, orderBy } from "lodash-es";
// strata constants
import { ISSUE_PRIORITIES } from "@strata/constants";
// types
import type { TIssue, TIssueOrderByOptions } from "@strata/types";
// helpers
import { convertToISODateString } from "@strata/utils";
//
import { getIssueIds, getSortOrderToFilterEmptyValues } from "./base-issues-utils";
import { BaseIssuePaginationStore } from "./base-issues-pagination.store";

/**
 * Sorting of the issue ids that make up a grouped list.
 *
 * The ordering logic is independent from fetching and from list mutations, so it
 * lives on its own layer of the base store chain.
 */
export abstract class BaseIssueSortingStore extends BaseIssuePaginationStore {
  /**
   * This Method is used to get data of the issue based on the ids of the data for states, labels and assignees
   * @param dataType what type of data is being sent
   * @param dataIds id/ids of the data that is to be populated
   * @param order ascending or descending for arrays of data
   * @returns string | string[] of sortable fields to be used for sorting
   */
  populateIssueDataForSorting(
    dataType: "state_id" | "label_ids" | "assignee_ids" | "module_ids" | "cycle_id" | "estimate_point",
    dataIds: string | string[] | null | undefined,
    projectId: string | undefined | null,
    order?: "asc" | "desc"
  ) {
    if (!dataIds) return;

    const dataValues: (string | number)[] = [];
    const isDataIdsArray = Array.isArray(dataIds);
    const dataIdsArray = isDataIdsArray ? dataIds : [dataIds];

    switch (dataType) {
      case "state_id": {
        const stateMap = this.rootIssueStore?.stateMap;
        if (!stateMap) break;
        for (const dataId of dataIdsArray) {
          const state = stateMap[dataId];
          if (state && state.name) dataValues.push(state.name.toLocaleLowerCase());
        }
        break;
      }
      case "label_ids": {
        const labelMap = this.rootIssueStore?.labelMap;
        if (!labelMap) break;
        for (const dataId of dataIdsArray) {
          const label = labelMap[dataId];
          if (label && label.name) dataValues.push(label.name.toLocaleLowerCase());
        }
        break;
      }
      case "assignee_ids": {
        const memberMap = this.rootIssueStore?.memberMap;
        if (!memberMap) break;
        for (const dataId of dataIdsArray) {
          const member = memberMap[dataId];
          if (member && member.first_name) dataValues.push(member.first_name.toLocaleLowerCase());
        }
        break;
      }
      case "module_ids": {
        const moduleMap = this.rootIssueStore?.moduleMap;
        if (!moduleMap) break;
        for (const dataId of dataIdsArray) {
          const currentModule = moduleMap[dataId];
          if (currentModule && currentModule.name) dataValues.push(currentModule.name.toLocaleLowerCase());
        }
        break;
      }
      case "cycle_id": {
        const cycleMap = this.rootIssueStore?.cycleMap;
        if (!cycleMap) break;
        for (const dataId of dataIdsArray) {
          const cycle = cycleMap[dataId];
          if (cycle && cycle.name) dataValues.push(cycle.name.toLocaleLowerCase());
        }
        break;
      }
      case "estimate_point": {
        // return if project Id does not exist
        if (!projectId) break;
        // get the estimate ID for the current Project
        const currentProjectEstimateId =
          this.rootIssueStore.rootStore.projectEstimate.currentActiveEstimateIdByProjectId(projectId);
        // return if current Estimate Id for the project is not available
        if (!currentProjectEstimateId) break;
        // get Estimate based on Id
        const estimate = this.rootIssueStore.rootStore.projectEstimate.estimateById(currentProjectEstimateId);
        // If Estimate is not available, then return
        if (!estimate) break;
        // Get Estimate Value
        const estimateKey = estimate?.estimatePointById(dataIds as string)?.key;

        // If Value string i not available or empty then return
        if (estimateKey === undefined) break;

        dataValues.push(estimateKey);
      }
    }

    return isDataIdsArray ? (order ? orderBy(dataValues, undefined, [order]) : dataValues) : dataValues;
  }

  issuesSortWithOrderBy = (issueIds: string[], key: TIssueOrderByOptions | undefined): string[] => {
    const issues = this.rootIssueStore.issues.getIssuesByIds(issueIds, this.isArchived ? "archived" : "un-archived");
    const array = orderBy(issues, (issue) => convertToISODateString(issue["created_at"]), ["desc"]);

    switch (key) {
      case "sort_order":
        return getIssueIds(orderBy(array, "sort_order"));
      case "state__name":
        return getIssueIds(
          orderBy(array, (issue) =>
            this.populateIssueDataForSorting("state_id", issue?.["state_id"], issue?.["project_id"])
          )
        );
      case "-state__name":
        return getIssueIds(
          orderBy(
            array,
            (issue) => this.populateIssueDataForSorting("state_id", issue?.["state_id"], issue?.["project_id"]),
            ["desc"]
          )
        );
      // dates
      case "created_at":
        return getIssueIds(orderBy(array, (issue) => convertToISODateString(issue["created_at"])));
      case "-created_at":
        return getIssueIds(orderBy(array, (issue) => convertToISODateString(issue["created_at"]), ["desc"]));
      case "updated_at":
        return getIssueIds(orderBy(array, (issue) => convertToISODateString(issue["updated_at"])));
      case "-updated_at":
        return getIssueIds(orderBy(array, (issue) => convertToISODateString(issue["updated_at"]), ["desc"]));
      case "start_date":
        return getIssueIds(orderBy(array, [getSortOrderToFilterEmptyValues.bind(null, "start_date"), "start_date"])); //preferring sorting based on empty values to always keep the empty values below
      case "-start_date":
        return getIssueIds(
          orderBy(
            array,
            [getSortOrderToFilterEmptyValues.bind(null, "start_date"), "start_date"], //preferring sorting based on empty values to always keep the empty values below
            ["asc", "desc"]
          )
        );

      case "target_date":
        return getIssueIds(orderBy(array, [getSortOrderToFilterEmptyValues.bind(null, "target_date"), "target_date"])); //preferring sorting based on empty values to always keep the empty values below
      case "-target_date":
        return getIssueIds(
          orderBy(
            array,
            [getSortOrderToFilterEmptyValues.bind(null, "target_date"), "target_date"], //preferring sorting based on empty values to always keep the empty values below
            ["asc", "desc"]
          )
        );

      // custom
      case "-priority": {
        const sortArray = ISSUE_PRIORITIES.map((i) => i.key);
        return getIssueIds(orderBy(array, (currentIssue: TIssue) => indexOf(sortArray, currentIssue?.priority)));
      }
      case "priority": {
        const sortArray = ISSUE_PRIORITIES.map((i) => i.key);
        return getIssueIds(
          orderBy(array, (currentIssue: TIssue) => indexOf(sortArray, currentIssue?.priority), ["desc"])
        );
      }

      // number
      case "attachment_count":
        return getIssueIds(orderBy(array, "attachment_count"));
      case "-attachment_count":
        return getIssueIds(orderBy(array, "attachment_count", ["desc"]));

      case "estimate_point__key":
        return getIssueIds(
          orderBy(array, [
            getSortOrderToFilterEmptyValues.bind(null, "estimate_point"),
            (issue) =>
              this.populateIssueDataForSorting("estimate_point", issue?.["estimate_point"], issue?.["project_id"]),
          ])
        ); //preferring sorting based on empty values to always keep the empty values below
      case "-estimate_point__key":
        return getIssueIds(
          orderBy(
            array,
            [
              getSortOrderToFilterEmptyValues.bind(null, "estimate_point"),
              (issue) =>
                this.populateIssueDataForSorting("estimate_point", issue?.["estimate_point"], issue?.["project_id"]),
            ], //preferring sorting based on empty values to always keep the empty values below
            ["asc", "desc"]
          )
        );

      case "link_count":
        return getIssueIds(orderBy(array, "link_count"));
      case "-link_count":
        return getIssueIds(orderBy(array, "link_count", ["desc"]));

      case "sub_issues_count":
        return getIssueIds(orderBy(array, "sub_issues_count"));
      case "-sub_issues_count":
        return getIssueIds(orderBy(array, "sub_issues_count", ["desc"]));

      // Array
      case "labels__name":
        return getIssueIds(
          orderBy(array, [
            getSortOrderToFilterEmptyValues.bind(null, "label_ids"), //preferring sorting based on empty values to always keep the empty values below
            (issue) =>
              this.populateIssueDataForSorting("label_ids", issue?.["label_ids"], issue?.["project_id"], "asc"),
          ])
        );
      case "-labels__name":
        return getIssueIds(
          orderBy(
            array,
            [
              getSortOrderToFilterEmptyValues.bind(null, "label_ids"), //preferring sorting based on empty values to always keep the empty values below
              (issue) =>
                this.populateIssueDataForSorting("label_ids", issue?.["label_ids"], issue?.["project_id"], "asc"),
            ],
            ["asc", "desc"]
          )
        );

      case "issue_module__module__name":
        return getIssueIds(
          orderBy(array, [
            getSortOrderToFilterEmptyValues.bind(null, "module_ids"), //preferring sorting based on empty values to always keep the empty values below
            (issue) =>
              this.populateIssueDataForSorting("module_ids", issue?.["module_ids"], issue?.["project_id"], "asc"),
          ])
        );
      case "-issue_module__module__name":
        return getIssueIds(
          orderBy(
            array,
            [
              getSortOrderToFilterEmptyValues.bind(null, "module_ids"), //preferring sorting based on empty values to always keep the empty values below
              (issue) =>
                this.populateIssueDataForSorting("module_ids", issue?.["module_ids"], issue?.["project_id"], "asc"),
            ],
            ["asc", "desc"]
          )
        );

      case "issue_cycle__cycle__name":
        return getIssueIds(
          orderBy(array, [
            getSortOrderToFilterEmptyValues.bind(null, "cycle_id"), //preferring sorting based on empty values to always keep the empty values below
            (issue) => this.populateIssueDataForSorting("cycle_id", issue?.["cycle_id"], issue?.["project_id"], "asc"),
          ])
        );
      case "-issue_cycle__cycle__name":
        return getIssueIds(
          orderBy(
            array,
            [
              getSortOrderToFilterEmptyValues.bind(null, "cycle_id"), //preferring sorting based on empty values to always keep the empty values below
              (issue) =>
                this.populateIssueDataForSorting("cycle_id", issue?.["cycle_id"], issue?.["project_id"], "asc"),
            ],
            ["asc", "desc"]
          )
        );

      case "assignees__first_name":
        return getIssueIds(
          orderBy(array, [
            getSortOrderToFilterEmptyValues.bind(null, "assignee_ids"), //preferring sorting based on empty values to always keep the empty values below
            (issue) =>
              this.populateIssueDataForSorting("assignee_ids", issue?.["assignee_ids"], issue?.["project_id"], "asc"),
          ])
        );
      case "-assignees__first_name":
        return getIssueIds(
          orderBy(
            array,
            [
              getSortOrderToFilterEmptyValues.bind(null, "assignee_ids"), //preferring sorting based on empty values to always keep the empty values below
              (issue) =>
                this.populateIssueDataForSorting("assignee_ids", issue?.["assignee_ids"], issue?.["project_id"], "asc"),
            ],
            ["asc", "desc"]
          )
        );

      default:
        return getIssueIds(array);
    }
  };
}
