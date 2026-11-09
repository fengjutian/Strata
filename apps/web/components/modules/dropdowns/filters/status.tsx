/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { MODULE_STATUS } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { ModuleStatusIcon } from "@strata/blocks/icons";
import type { TModuleStatus } from "@strata/types";
// components
import { FilterSubmenu } from "@/components/common/filters/filter-submenu";

type Props = {
  appliedFilters: TModuleStatus[] | null;
  handleUpdate: (val: string) => void;
};

export const FilterStatus = observer(function FilterStatus(props: Props) {
  const { appliedFilters, handleUpdate } = props;
  // strata hooks
  const { t } = useTranslation();
  // derived values
  const options = MODULE_STATUS.map((status) => ({
    value: status.value,
    label: t(status.i18n_label),
    icon: <ModuleStatusIcon status={status.value} />,
  }));

  return <FilterSubmenu label="Status" options={options} appliedFilters={appliedFilters} onToggle={handleUpdate} />;
});
