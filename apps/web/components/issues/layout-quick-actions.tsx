/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makestrata/propel/components/menu";
import { MoreHorizontalOutline } from "@makestrata/propel/icons";
import type { TContextMenuItem } from "@strata/blocks/context-menu";
import { getRenderableItems, resolveItemVariant } from "@strata/blocks/context-menu";
import { setToast } from "@strata/blocks/toast";
import { useTranslation } from "@strata/i18n";
import { copyUrlToClipboard } from "@strata/utils";
import { useLayoutMenuItems } from "@/components/common/quick-actions-helper";

type Props = {
  workspaceSlug: string;
  projectId: string;
  storeType: "PROJECT" | "EPIC";
};

export const LayoutQuickActions = observer(function LayoutQuickActions(props: Props) {
  const { workspaceSlug, projectId, storeType } = props;
  // strata hooks
  const { t } = useTranslation();

  const layoutLink = `${workspaceSlug}/projects/${projectId}/${storeType === "EPIC" ? "epics" : "issues"}`;

  const handleCopyLink = async () => {
    await copyUrlToClipboard(layoutLink);
    setToast({
      type: "success",
      title: "Link copied",
      message: `${storeType === "EPIC" ? "Epics" : "Work items"} link copied to clipboard.`,
    });
  };

  const handleOpenInNewTab = () => window.open(`/${layoutLink}`, "_blank");

  const menuResult = useLayoutMenuItems({
    workspaceSlug,
    projectId,
    storeType,
    handleCopyLink,
    handleOpenInNewTab,
  });

  const MENU_ITEMS: TContextMenuItem[] = Array.isArray(menuResult) ? menuResult : menuResult.items;
  const additionalModals = Array.isArray(menuResult) ? null : menuResult.modals;

  return (
    <>
      {additionalModals}
      <Menu>
        <MenuTrigger
          render={
            <IconButton
              size="md"
              variant="tertiary"
              icon={<Icon icon={MoreHorizontalOutline} />}
              aria-label={t("common.options")}
            />
          }
        />
        <MenuContent side="bottom" align="end">
          {getRenderableItems(MENU_ITEMS).map((item) => (
            <MenuItem
              key={item.key}
              variant={resolveItemVariant(item)}
              icon={item.icon ? <Icon icon={item.icon} /> : undefined}
              label={item.title ?? ""}
              onClick={item.action}
              disabled={item.disabled}
            />
          ))}
        </MenuContent>
      </Menu>
    </>
  );
});
