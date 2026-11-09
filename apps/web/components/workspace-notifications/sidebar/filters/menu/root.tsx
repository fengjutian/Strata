/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { FilterOutline } from "@makestrata/propel/icons";
// strata imports
import type { ENotificationFilterType } from "@strata/constants";
import { FILTER_TYPE_OPTIONS } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Menu, MenuCheckboxItem, MenuContent, MenuTrigger } from "@makestrata/propel/components/menu";
import { Tooltip } from "@makestrata/propel/components/tooltip";
// hooks
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import { usePlatformOS } from "@/hooks/use-platform-os";

export const NotificationFilter = observer(function NotificationFilter() {
  // hooks
  const { isMobile } = usePlatformOS();
  const { t } = useTranslation();
  const { filters, updateFilters } = useWorkspaceNotifications();

  const handleFilterTypeChange = (filterType: ENotificationFilterType, filterValue: boolean) =>
    updateFilters("type", {
      ...filters.type,
      [filterType]: filterValue,
    });

  return (
    // A toggle list: checkbox rows keep the menu open, as the legacy popover did.
    <Menu>
      <Tooltip label={t("notification.options.filters")} side="bottom" disabled={isMobile}>
        <MenuTrigger
          render={
            <IconButton
              size="sm"
              variant="secondary"
              icon={<Icon icon={FilterOutline} />}
              aria-label={t("notification.options.filters")}
            />
          }
        />
      </Tooltip>
      <MenuContent side="bottom" align="end">
        {FILTER_TYPE_OPTIONS.map((filter) => (
          <MenuCheckboxItem
            key={filter.value}
            label={t(filter.i18n_label)}
            checked={filters?.type?.[filter.value] || false}
            onCheckedChange={(checked) => handleFilterTypeChange(filter.value, checked)}
          />
        ))}
      </MenuContent>
    </Menu>
  );
});
