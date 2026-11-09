/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { Icon } from "@makestrata/propel/components/icon";
import { IconPill } from "@makestrata/propel/components/pill";
import { CloseOutline } from "@makestrata/propel/icons";
import type { IFilterInstance } from "@strata/shared-state";
import type { TExternalFilter, TFilterProperty } from "@strata/types";

interface FilterItemCloseButtonProps<P extends TFilterProperty, E extends TExternalFilter> {
  conditionId: string;
  filter: IFilterInstance<P, E>;
}

export const FilterItemCloseButton = observer(function FilterItemCloseButton<
  P extends TFilterProperty,
  E extends TExternalFilter,
>(props: FilterItemCloseButtonProps<P, E>) {
  const { conditionId, filter } = props;

  const handleRemoveFilter = () => {
    filter.removeCondition(conditionId);
  };

  return <IconPill onClick={handleRemoveFilter} aria-label="Remove filter" icon={<Icon icon={CloseOutline} />} />;
});
