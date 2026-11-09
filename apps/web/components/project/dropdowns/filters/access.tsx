/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { NETWORK_CHOICES } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
// components
import { FilterSubmenu } from "@/components/common/filters/filter-submenu";
// local imports
import { ProjectNetworkIcon } from "../../project-network-icon";

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
};

export const FilterAccess = observer(function FilterAccess(props: Props) {
  const { appliedFilters, handleUpdate } = props;
  // strata hooks
  const { t } = useTranslation();
  // derived values
  const options = NETWORK_CHOICES.map((access) => ({
    value: `${access.key}`,
    label: t(access.i18n_label),
    icon: <ProjectNetworkIcon iconKey={access.iconKey} />,
  }));

  return <FilterSubmenu label="Access" options={options} appliedFilters={appliedFilters} onToggle={handleUpdate} />;
});
