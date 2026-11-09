/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { ExpandableSearch } from "@makestrata/propel/components/expandable-search";
import { useTranslation } from "@strata/i18n";
// hooks
import { useProjectFilter } from "@/hooks/store/use-project-filter";

export const ProjectSearch = observer(function ProjectSearch() {
  // i18n
  const { t } = useTranslation();
  // hooks
  const { searchQuery, updateSearchQuery } = useProjectFilter();

  return (
    <ExpandableSearch
      size="md"
      aria-label={t("common.search.label")}
      clearLabel={t("common.clear")}
      placeholder={t("common.search.label")}
      value={searchQuery}
      onValueChange={(value) => updateSearchQuery(value)}
    />
  );
});
