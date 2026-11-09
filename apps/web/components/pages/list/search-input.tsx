/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { ExpandableSearch } from "@makestrata/propel/components/expandable-search";
import { useTranslation } from "@strata/i18n";

type Props = {
  searchQuery: string;
  updateSearchQuery: (val: string) => void;
};

export function PageSearchInput(props: Props) {
  const { searchQuery, updateSearchQuery } = props;
  // strata hooks
  const { t } = useTranslation();

  return (
    <ExpandableSearch
      aria-label={t("search")}
      clearLabel={t("common.clear")}
      size="md"
      placeholder="Search pages"
      value={searchQuery}
      onValueChange={(value) => updateSearchQuery(value)}
    />
  );
}
