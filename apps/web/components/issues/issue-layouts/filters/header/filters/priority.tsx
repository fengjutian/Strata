/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { ISSUE_PRIORITIES } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { PriorityIcon } from "@strata/blocks/icons";
// components
import { FilterSubmenu } from "@/components/common/filters/filter-submenu";

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
};

const PRIORITY_OPTIONS = ISSUE_PRIORITIES.map((priority) => ({
  value: priority.key,
  label: priority.title,
  icon: <PriorityIcon priority={priority.key} className="h-3.5 w-3.5" />,
}));

export const FilterPriority = observer(function FilterPriority(props: Props) {
  const { appliedFilters, handleUpdate } = props;
  const { t } = useTranslation();

  return (
    <FilterSubmenu
      label={t("common.priority")}
      options={PRIORITY_OPTIONS}
      appliedFilters={appliedFilters}
      onToggle={handleUpdate}
    />
  );
});
