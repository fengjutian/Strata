/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { useTranslation } from "@strata/i18n";
import { EmptyStateCompact } from "@strata/blocks/empty-state";

export function PageNavigationPaneOutlineTabEmptyState() {
  // translation
  const { t } = useTranslation();

  return (
    <EmptyStateCompact
      assetKey="page"
      title={t("page_navigation_pane.tabs.outline.empty_state.title")}
      description={t("page_navigation_pane.tabs.outline.empty_state.description")}
    />
  );
}
