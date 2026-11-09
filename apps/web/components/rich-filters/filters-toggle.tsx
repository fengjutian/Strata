/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { FilterOutline, SelectedFilterOutline } from "@makestrata/propel/icons";
import { useTranslation } from "@strata/i18n";
import { cn } from "@strata/utils";
import type { IFilterInstance } from "@strata/shared-state";
import type { TExternalFilter, TFilterProperty } from "@strata/types";
// components
import { AddFilterButton } from "@/components/rich-filters/add-filters/button";

type TFiltersToggleProps<P extends TFilterProperty, E extends TExternalFilter> = {
  filter: IFilterInstance<P, E> | undefined;
};

export const FiltersToggle = observer(function FiltersToggle<P extends TFilterProperty, E extends TExternalFilter>(
  props: TFiltersToggleProps<P, E>
) {
  const { filter } = props;
  // strata hooks
  const { t } = useTranslation();
  // derived values
  const hasAnyConditions = (filter?.allConditionsForDisplay.length ?? 0) > 0;
  const isFilterRowVisible = filter?.isVisible ?? false;
  const hasUpdates = filter?.canUpdateView === true && filter?.hasChanges === true;
  const showFilterRowChangesPill = hasUpdates || hasAnyConditions === true;
  const showAddFilterButton = !hasAnyConditions && !isFilterRowVisible && !hasUpdates;

  const handleToggleFilter = () => {
    if (!filter) {
      console.error("Filters toggle error - filter instance not available");
      return;
    }
    filter.toggleVisibility();
  };

  const iconClassName = cn({
    "text-accent-primary [&_path]:fill-current": showFilterRowChangesPill,
  });

  // Show the add filter button when there are no active conditions, the filter row is hidden, and no unsaved changes exist
  if (filter && showAddFilterButton) {
    return (
      <AddFilterButton
        filter={filter}
        buttonConfig={{
          variant: "secondary",
          size: "md",
          label: null,
        }}
        onFilterSelect={() => filter?.toggleVisibility(true)}
      />
    );
  }

  const FilterIcon = showFilterRowChangesPill ? SelectedFilterOutline : FilterOutline;

  return (
    <IconButton
      size="md"
      variant="secondary"
      icon={<Icon icon={<FilterIcon className={iconClassName} />} />}
      onClick={handleToggleFilter}
      aria-label={t("common.filters")}
      aria-pressed={isFilterRowVisible}
      // Accent chrome while the filter row is open or any filter is applied (Propel has no tinted variant).
      render={(buttonProps) => (
        <button
          type="button"
          {...buttonProps}
          className={cn(buttonProps.className, {
            "border-accent-strong bg-accent-subtle text-accent-primary hover:bg-accent-subtle-hover active:bg-accent-subtle-active":
              isFilterRowVisible || showFilterRowChangesPill,
          })}
        />
      )}
    />
  );
});
