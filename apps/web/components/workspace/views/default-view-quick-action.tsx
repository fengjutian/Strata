/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";

import { useTranslation } from "@strata/i18n";
// strata imports
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makestrata/propel/components/menu";
import { LinkOutline, MoreHorizontalOutline, NewTabOutline } from "@makestrata/propel/icons";
import type { TContextMenuItem } from "@strata/blocks/context-menu";
import { getRenderableItems, resolveItemVariant } from "@strata/blocks/context-menu";
import { setToast } from "@strata/blocks/toast";
// ui
import type { TStaticViewTypes } from "@strata/types";
import { copyUrlToClipboard } from "@strata/utils";

type Props = {
  workspaceSlug: string;
  view: {
    key: TStaticViewTypes;
    i18n_label: string;
  };
};

export const DefaultWorkspaceViewQuickActions = observer(function DefaultWorkspaceViewQuickActions(props: Props) {
  const { workspaceSlug, view } = props;

  const { t } = useTranslation();

  const viewLink = `${workspaceSlug}/workspace-views/${view.key}`;
  const handleCopyText = async () => {
    try {
      await copyUrlToClipboard(viewLink);
      setToast({
        type: "success",
        title: "Link Copied!",
        message: "View link copied to clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy the view link:", error);
    }
  };
  const handleOpenInNewTab = () => window.open(`/${viewLink}`, "_blank");

  const MENU_ITEMS: TContextMenuItem[] = [
    {
      key: "open-new-tab",
      action: handleOpenInNewTab,
      title: t("open_in_new_tab"),
      icon: NewTabOutline,
    },
    {
      key: "copy-link",
      action: () => void handleCopyText(),
      title: t("copy_link"),
      icon: LinkOutline,
    },
  ];

  return (
    <Menu>
      <MenuTrigger
        render={
          <IconButton
            variant="ghost"
            size="sm"
            aria-label={t("aria_labels.common.more_actions")}
            icon={<Icon icon={MoreHorizontalOutline} />}
          />
        }
      />
      <MenuContent side="bottom" align="end">
        {getRenderableItems(MENU_ITEMS).map((item) => (
          <MenuItem
            key={item.key}
            variant={resolveItemVariant(item)}
            icon={item.icon ? <Icon icon={item.icon} /> : undefined}
            label={t(item.title || "")}
            description={item.description}
            disabled={item.disabled}
            onClick={() => {
              item.action();
            }}
          />
        ))}
      </MenuContent>
    </Menu>
  );
});
