/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { LeftSidePaneOutline } from "@makestrata/propel/icons";
import { useTranslation } from "@strata/i18n";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Icon } from "@makestrata/propel/components/icon";

export const AppSidebarToggleButton = observer(function AppSidebarToggleButton() {
  // store hooks
  const { sidebarCollapsed, toggleSidebar, sidebarPeek, toggleSidebarPeek } = useAppTheme();
  // strata hooks
  const { t } = useTranslation();

  return (
    <IconButton
      size="md"
      variant="ghost"
      icon={<Icon icon={LeftSidePaneOutline} />}
      aria-label={t(
        sidebarCollapsed
          ? "aria_labels.projects_sidebar.expand_sidebar"
          : "aria_labels.projects_sidebar.collapse_sidebar"
      )}
      onClick={() => {
        if (sidebarPeek) toggleSidebarPeek(false);
        toggleSidebar();
      }}
    />
  );
});
