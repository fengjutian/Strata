/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { isEmpty, set } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// strata constants
import type { TSupportedFilterTypeForUpdate } from "@strata/constants";
import { EIssueFilterType } from "@strata/constants";
// types
import type {
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  IIssueFilters,
  IIssueFiltersResponse,
  IssuePaginationOptions,
  TIssueKanbanFilters,
  TIssueParams,
  TSupportedFilterForUpdate,
  TWorkItemFilterExpression,
} from "@strata/types";
import { EIssueLayoutTypes, EIssuesStoreType } from "@strata/types";
import { handleIssueQueryParamsByLayout } from "@strata/utils";
//
import type { IIssueRootStore } from "../root.store";
import { IssueFilterHelperStore } from "./issue-filter-helper.store";

/**
 * The parts that differ between the issue list filter stores (project, cycle,
 * module, view, profile, workspace, archived, draft).
 *
 * Everything else - reading/merging filters, deriving the route params, the
 * update switch and the server round trip - is identical for all of them and
 * lives in {@link BaseIssueFiltersStore}.
 */
export interface IIssueFiltersStoreOptions {
  /** Key used by the local (kanban) filter storage and for `EIssuesStoreType` checks. */
  storeType: EIssuesStoreType;
  /** Scope id of the filter bucket for the current route. */
  getScopeId: () => string | undefined;
  /**
   * Query param that carries the scope id, e.g. `cycle` or `module`.
   * Omitted by stores whose route already carries the project (project, archived).
   */
  scopeParam?: TIssueParams;
  /** Route param family the filters are serialized for. Defaults to `issues`. */
  layoutKey?: "issues" | "profile_issues" | "my_issues";
  /** Fixed layout used for param derivation (workspace always serialises as a spreadsheet). */
  paramsLayout?: EIssueLayoutTypes;
  /** Extra params merged after the filter params, e.g. the static view conditions. */
  extendFilterParams?: (
    params: Partial<Record<TIssueParams, string | boolean>>,
    scopeId: string
  ) => Partial<Record<TIssueParams, string | boolean>>;
  /** Defaults merged into the stored display filters (workspace defaults to a spreadsheet). */
  displayFilterDefaults?: IIssueDisplayFilterOptions;
  /** Normalises the computed display filters, e.g. rewriting the manual sort order. */
  normalizeDisplayFilters?: (filters: IIssueDisplayFilterOptions) => IIssueDisplayFilterOptions;
  /** Whether a rich filter expression is persisted. View stores only keep it in memory. Defaults to true. */
  persistRichFilters?: boolean;
  /** Group by used when switching to kanban with no group selected. Defaults to `state`. */
  defaultGroupBy?: "state" | "priority";
  /** Server loader. Local-storage stores override `loadFilters` instead. */
  fetchFilters?: (workspaceSlug: string, projectId: string, scopeId: string) => Promise<IIssueFiltersResponse>;
  /** Server persistence. Local-storage stores override `persistFilters` instead. */
  patchFilters?: (
    workspaceSlug: string,
    projectId: string,
    scopeId: string,
    data: Partial<IIssueFiltersResponse>
  ) => Promise<unknown>;
  /** Drop the locally stored issue ids, e.g. when the layout changes. Not every store keeps a list. */
  clearIssues?: () => void;
  /** Re-fetch the first page with the already stored pagination options. */
  refetchIssues: (workspaceSlug: string, projectId: string, scopeId: string) => void;
  /** Local storage scope for the kanban toggle helpers. */
  localScope: (scopeId: string) => { viewId: string | undefined; userId: string | undefined };
}

/**
 * Raw filters as returned by the API or read back from the local filter
 * storage. Local storage stores also keep the kanban toggles in the same
 * record.
 */
export type TIssueFiltersSource = Partial<IIssueFiltersResponse> & {
  kanban_filters?: TIssueKanbanFilters;
};

/**
 * Filter store shared by every issue list filter store: project, cycle, module,
 * archived, profile, workspace, project-views and workspace-draft.
 *
 * Owns the `filters` observable (keyed by scope id), the computed
 * `issueFilters` / `appliedFilters`, the route param derivation, the
 * display-filter / display-property / kanban update flow and the persistence
 * plumbing (API or local filter storage). Stores with a different backend
 * override `loadFilters`, `persistFilters` or `applyRichFilters`.
 */
export abstract class BaseIssueFiltersStore extends IssueFilterHelperStore {
  // observables
  filters: Record<string, IIssueFilters> = {};
  // root store
  rootIssueStore: IIssueRootStore;
  // per scope wiring
  protected readonly options: IIssueFiltersStoreOptions;

  constructor(rootStore: IIssueRootStore, options: IIssueFiltersStoreOptions) {
    super();
    makeObservable(this, {
      // observables
      filters: observable,
      // computed
      issueFilters: computed,
      appliedFilters: computed,
      // actions
      fetchFilters: action,
      updateFilters: action,
    });
    // root store
    this.rootIssueStore = rootStore;
    this.options = options;
  }

  get issueFilters() {
    const scopeId = this.options.getScopeId();
    if (!scopeId) return undefined;

    return this.getIssueFilters(scopeId);
  }

  get appliedFilters() {
    const scopeId = this.options.getScopeId();
    if (!scopeId) return undefined;

    return this.getAppliedFilters(scopeId);
  }

  getIssueFilters(scopeId: string | undefined) {
    if (!scopeId) return undefined;

    const displayFilters = this.filters[scopeId] || undefined;
    if (isEmpty(displayFilters)) return undefined;

    const _filters: IIssueFilters = this.computedIssueFilters(displayFilters);

    return _filters;
  }

  /**
   * Resolves the filter bucket key. Stores that are scoped to the project (and
   * therefore do not repeat the project id in their action arguments) fall back
   * to `projectId`.
   */
  protected resolveScopeId(projectId: string, scopeId?: string) {
    return scopeId ?? projectId;
  }

  getAppliedFilters(scopeId: string | undefined) {
    const userFilters = this.getIssueFilters(scopeId);
    if (!userFilters) return undefined;

    const layout = this.options.paramsLayout ?? userFilters?.displayFilters?.layout;
    const filteredParams = handleIssueQueryParamsByLayout(layout, this.options.layoutKey ?? "issues");
    if (!filteredParams) return undefined;

    const scopeParam = this.options.scopeParam;
    if (scopeParam && filteredParams.includes(scopeParam)) filteredParams.splice(filteredParams.indexOf(scopeParam), 1);

    const filteredRouteParams: Partial<Record<TIssueParams, string | boolean>> = this.computedFilteredParams(
      userFilters?.richFilters,
      userFilters?.displayFilters,
      filteredParams
    );

    return filteredRouteParams;
  }

  getFilterParams = computedFn(
    (
      options: IssuePaginationOptions,
      scopeId: string,
      cursor: string | undefined,
      groupId: string | undefined,
      subGroupId: string | undefined
    ) => {
      let filterParams = this.getAppliedFilters(scopeId);

      if (!filterParams) {
        filterParams = {};
      }
      if (this.options.scopeParam) filterParams[this.options.scopeParam] = scopeId;
      filterParams = this.extendFilterParams(filterParams, scopeId);

      const paginationParams = this.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
      return paginationParams;
    }
  );

  fetchFilters = async (workspaceSlug: string, projectIdArg?: string, scopeIdArg?: string) => {
    const projectId = projectIdArg ?? "";
    const scopeId = this.resolveScopeId(projectId, scopeIdArg);
    const _filters = await this.loadFilters(workspaceSlug, projectId, scopeId);

    const richFilters: TWorkItemFilterExpression = _filters?.rich_filters as TWorkItemFilterExpression;
    let displayFilters: IIssueDisplayFilterOptions = this.computedDisplayFilters(
      _filters?.display_filters as IIssueDisplayFilterOptions,
      this.options.displayFilterDefaults
    );
    if (this.options.normalizeDisplayFilters) displayFilters = this.options.normalizeDisplayFilters(displayFilters);
    const displayProperties: IIssueDisplayProperties = this.computedDisplayProperties(
      _filters?.display_properties as IIssueDisplayProperties
    );

    // kanban toggle helpers: local storage stores return them with the filters,
    // server backed stores keep them in the local filter storage only
    const loadedKanbanFilters = _filters?.kanban_filters;
    const kanbanFilters = {
      group_by: loadedKanbanFilters?.group_by ?? [],
      sub_group_by: loadedKanbanFilters?.sub_group_by ?? [],
    };
    const currentUserId = this.rootIssueStore.currentUserId;
    if (currentUserId && !loadedKanbanFilters) {
      const { viewId, userId } = this.options.localScope(scopeId);
      const _kanbanFilters = this.handleIssuesLocalFilters.get(this.options.storeType, workspaceSlug, viewId, userId);
      kanbanFilters.group_by = _kanbanFilters?.kanban_filters?.group_by || [];
      kanbanFilters.sub_group_by = _kanbanFilters?.kanban_filters?.sub_group_by || [];
    }

    runInAction(() => {
      set(this.filters, [scopeId, "richFilters"], richFilters);
      set(this.filters, [scopeId, "displayFilters"], displayFilters);
      set(this.filters, [scopeId, "displayProperties"], displayProperties);
      set(this.filters, [scopeId, "kanbanFilters"], kanbanFilters);
    });
  };

  /** Loads the raw filters. Server backed stores use the configured endpoints. */
  protected loadFilters(workspaceSlug: string, projectId: string, scopeId: string): Promise<TIssueFiltersSource> {
    if (!this.options.fetchFilters) throw new Error("fetchFilters is not configured for this filter store");
    return this.options.fetchFilters(workspaceSlug, projectId, scopeId);
  }

  /**
   * Persists one filter group. Server backed stores patch the API; local storage
   * stores (archived, profile, draft) override this to write the micro store.
   */
  protected persistFilters(
    workspaceSlug: string,
    projectId: string,
    scopeId: string,
    type: EIssueFilterType,
    payload: TSupportedFilterForUpdate | TWorkItemFilterExpression
  ): Promise<unknown> {
    if (!this.options.patchFilters) throw new Error("patchFilters is not configured for this filter store");
    return this.options.patchFilters(workspaceSlug, projectId, scopeId, { [type]: payload });
  }

  /**
   * Store specific param post-processing (static view conditions, …).
   * Override instead of using the option when access to `this` is required.
   */
  protected extendFilterParams(
    params: Partial<Record<TIssueParams, string | boolean>>,
    scopeId: string
  ): Partial<Record<TIssueParams, string | boolean>> {
    return this.options.extendFilterParams ? this.options.extendFilterParams(params, scopeId) : params;
  }

  /**
   * Stores a rich filter expression.
   *
   * Two calling conventions exist in the stores: with an explicit scope id
   * (`鈥? cycleId, filters`) and without one (`鈥? filters`, for stores whose
   * scope already is the project). Both are accepted here.
   */
  updateFilterExpression = async (
    workspaceSlug: string,
    projectId: string,
    scopeIdOrFilters: string | TWorkItemFilterExpression,
    filtersArg?: TWorkItemFilterExpression
  ) => {
    const hasScopeId = typeof scopeIdOrFilters === "string";
    const scopeId = hasScopeId ? scopeIdOrFilters : this.resolveScopeId(projectId);
    const filters = hasScopeId ? (filtersArg as TWorkItemFilterExpression) : scopeIdOrFilters;

    return this.applyRichFilters(workspaceSlug, projectId, scopeId, filters);
  };

  /**
   * Writes the rich filters locally, refetches the list and persists them.
   * Exposed as a protected method so stores with a different public argument
   * order (e.g. project) can reuse it from their own `updateFilterExpression`.
   */
  protected async applyRichFilters(
    workspaceSlug: string,
    projectId: string,
    scopeId: string,
    filters: TWorkItemFilterExpression
  ) {
    try {
      runInAction(() => {
        set(this.filters, [scopeId, "richFilters"], filters);
      });

      this.options.refetchIssues(workspaceSlug, projectId, scopeId);
      if (this.options.persistRichFilters !== false) {
        await this.persistFilters(workspaceSlug, projectId, scopeId, EIssueFilterType.FILTERS, filters);
      }
    } catch (error) {
      console.log("error while updating rich filters", error);
      throw error;
    }
  }

  updateFilters = async (
    workspaceSlug: string,
    projectIdOrType: string | undefined,
    typeOrFilters: TSupportedFilterTypeForUpdate | TSupportedFilterForUpdate,
    filtersArg?: TSupportedFilterForUpdate,
    scopeIdArg?: string
  ) => {
    // workspace-draft calls this with (workspaceSlug, type, filters)
    const isShortForm =
      filtersArg === undefined &&
      typeof projectIdOrType === "string" &&
      Object.values(EIssueFilterType).includes(projectIdOrType as EIssueFilterType);

    const projectId = isShortForm ? "" : (projectIdOrType ?? "");
    const type = (isShortForm ? projectIdOrType : typeOrFilters) as TSupportedFilterTypeForUpdate;
    const filters = (isShortForm ? typeOrFilters : filtersArg) as TSupportedFilterForUpdate;
    const scopeId = isShortForm ? (this.options.getScopeId() ?? projectId) : this.resolveScopeId(projectId, scopeIdArg);

    try {
      if (isEmpty(this.filters) || isEmpty(this.filters[scopeId])) return;

      const _filters = {
        richFilters: this.filters[scopeId].richFilters,
        displayFilters: this.filters[scopeId].displayFilters as IIssueDisplayFilterOptions,
        displayProperties: this.filters[scopeId].displayProperties as IIssueDisplayProperties,
        kanbanFilters: this.filters[scopeId].kanbanFilters as TIssueKanbanFilters,
      };

      switch (type) {
        case EIssueFilterType.DISPLAY_FILTERS: {
          const updatedDisplayFilters = filters as IIssueDisplayFilterOptions;
          _filters.displayFilters = { ..._filters.displayFilters, ...updatedDisplayFilters };

          // set sub_group_by to null if group_by is set to null
          if (_filters.displayFilters.group_by === null) {
            _filters.displayFilters.sub_group_by = null;
            updatedDisplayFilters.sub_group_by = null;
          }
          // set sub_group_by to null if layout is switched to kanban group_by and sub_group_by are same
          if (
            _filters.displayFilters.layout === "kanban" &&
            _filters.displayFilters.group_by === _filters.displayFilters.sub_group_by
          ) {
            _filters.displayFilters.sub_group_by = null;
            updatedDisplayFilters.sub_group_by = null;
          }
          // set group_by to state (or the store default) if layout is switched to kanban and group_by is null
          if (_filters.displayFilters.layout === "kanban" && _filters.displayFilters.group_by === null) {
            const defaultGroupBy = this.options.defaultGroupBy ?? "state";
            _filters.displayFilters.group_by = defaultGroupBy;
            updatedDisplayFilters.group_by = defaultGroupBy;
          }

          runInAction(() => {
            Object.keys(updatedDisplayFilters).forEach((_key) => {
              set(
                this.filters,
                [scopeId, "displayFilters", _key],
                updatedDisplayFilters[_key as keyof IIssueDisplayFilterOptions]
              );
            });
          });

          if (this.getShouldClearIssues(updatedDisplayFilters)) {
            this.options.clearIssues?.(); // clear issues for local store when some filters like layout changes
          }

          if (this.getShouldReFetchIssues(updatedDisplayFilters)) {
            this.options.refetchIssues(workspaceSlug, projectId, scopeId);
          }

          await this.persistFilters(
            workspaceSlug,
            projectId,
            scopeId,
            EIssueFilterType.DISPLAY_FILTERS,
            _filters.displayFilters
          );

          break;
        }
        case EIssueFilterType.DISPLAY_PROPERTIES: {
          const updatedDisplayProperties = filters as IIssueDisplayProperties;
          _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

          runInAction(() => {
            Object.keys(updatedDisplayProperties).forEach((_key) => {
              set(
                this.filters,
                [scopeId, "displayProperties", _key],
                updatedDisplayProperties[_key as keyof IIssueDisplayProperties]
              );
            });
          });

          await this.persistFilters(
            workspaceSlug,
            projectId,
            scopeId,
            EIssueFilterType.DISPLAY_PROPERTIES,
            _filters.displayProperties
          );
          break;
        }

        case EIssueFilterType.KANBAN_FILTERS: {
          const updatedKanbanFilters = filters as TIssueKanbanFilters;
          _filters.kanbanFilters = { ..._filters.kanbanFilters, ...updatedKanbanFilters };

          const currentUserId = this.rootIssueStore.currentUserId;
          if (currentUserId) {
            const { viewId, userId } = this.options.localScope(scopeId);
            this.handleIssuesLocalFilters.set(this.options.storeType, type, workspaceSlug, viewId, userId, {
              kanban_filters: _filters.kanbanFilters,
            });
          }

          runInAction(() => {
            Object.keys(updatedKanbanFilters).forEach((_key) => {
              set(
                this.filters,
                [scopeId, "kanbanFilters", _key],
                updatedKanbanFilters[_key as keyof TIssueKanbanFilters]
              );
            });
          });

          break;
        }
        default:
          break;
      }
    } catch (error) {
      if (scopeId) this.fetchFilters(workspaceSlug, projectId, scopeId);
      throw error;
    }
  };
}
