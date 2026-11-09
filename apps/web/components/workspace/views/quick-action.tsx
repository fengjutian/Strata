/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
// strata imports
import { EUserPermissions, EUserPermissionsLevel } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makestrata/propel/components/menu";
import { MoreHorizontalOutline } from "@makestrata/propel/icons";
import { getRenderableItems, resolveItemVariant } from "@strata/blocks/context-menu";
import { setToast } from "@strata/blocks/toast";
import type { IWorkspaceView } from "@strata/types";
import { copyUrlToClipboard } from "@strata/utils";
// helpers
import { useViewMenuItems } from "@/components/common/quick-actions-helper";
// hooks
import { useUser, useUserPermissions } from "@/hooks/store/user";
// local imports
import { DeleteGlobalViewModal } from "./delete-view-modal";
import { CreateUpdateWorkspaceViewModal } from "./modal";

type Props = {
  workspaceSlug: string;
  view: IWorkspaceView;
};

export const WorkspaceViewQuickActions = observer(function WorkspaceViewQuickActions(props: Props) {
  const { workspaceSlug, view } = props;
  // states
  const [updateViewModal, setUpdateViewModal] = useState(false);
  const [deleteViewModal, setDeleteViewModal] = useState(false);
  // strata hooks
  const { t } = useTranslation();
  // store hooks
  const { data } = useUser();
  const { allowPermissions } = useUserPermissions();
  // auth
  const isOwner = view?.owned_by === data?.id;
  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);

  const viewLink = `${workspaceSlug}/workspace-views/${view.id}`;
  const handleCopyText = async () => {
    await copyUrlToClipboard(viewLink);
    setToast({
      type: "success",
      title: "Link Copied!",
      message: "View link copied to clipboard.",
    });
  };

  const handleOpenInNewTab = () => window.open(`/${viewLink}`, "_blank");

  const MENU_ITEMS = useViewMenuItems({
    isOwner,
    isAdmin,
    handleDelete: () => setDeleteViewModal(true),
    handleEdit: () => setUpdateViewModal(true),
    handleOpenInNewTab,
    handleCopyLink: handleCopyText,
    workspaceSlug,
    view,
  });

  return (
    <>
      <CreateUpdateWorkspaceViewModal data={view} isOpen={updateViewModal} onClose={() => setUpdateViewModal(false)} />
      <DeleteGlobalViewModal data={view} isOpen={deleteViewModal} onClose={() => setDeleteViewModal(false)} />
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
          {getRenderableItems(MENU_ITEMS.items).map((item) => (
            <MenuItem
              key={item.key}
              variant={resolveItemVariant(item)}
              icon={item.icon ? <Icon icon={item.icon} /> : undefined}
              label={item.title ?? ""}
              description={item.description}
              disabled={item.disabled}
              onClick={() => {
                item.action();
              }}
            />
          ))}
        </MenuContent>
      </Menu>
    </>
  );
});
