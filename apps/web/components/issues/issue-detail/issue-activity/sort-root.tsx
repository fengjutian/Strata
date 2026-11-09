/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { memo } from "react";
import { SortAscendingOutline, SortDescendingOutline } from "@makestrata/propel/icons";
// strata package imports
import { E_SORT_ORDER } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Icon } from "@makestrata/propel/components/icon";

export type TActivitySortRoot = {
  sortOrder: E_SORT_ORDER;
  toggleSort: () => void;
};
export const ActivitySortRoot = memo(function ActivitySortRoot(props: TActivitySortRoot) {
  const { t } = useTranslation();
  const SortIcon = props.sortOrder === E_SORT_ORDER.ASC ? SortAscendingOutline : SortDescendingOutline;
  return (
    <IconButton
      variant="tertiary"
      size="md"
      icon={<Icon icon={SortIcon} />}
      aria-label={t("common.sort.label")}
      onClick={props.toggleSort}
    />
  );
});

ActivitySortRoot.displayName = "ActivitySortRoot";
