/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useTranslation } from "@strata/i18n";
// ui
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makestrata/propel/components/menu";
import { MoreHorizontalOutline } from "@makestrata/propel/icons";
import type { TContextMenuItem } from "@strata/blocks/context-menu";
import { ContextMenu, getRenderableItems, resolveItemVariant } from "@strata/blocks/context-menu";

export interface Props {
  parentRef: React.RefObject<HTMLElement | null>;
  MENU_ITEMS: TContextMenuItem[];
}

export const WorkspaceDraftIssueQuickActions = observer(function WorkspaceDraftIssueQuickActions(props: Props) {
  const { parentRef, MENU_ITEMS } = props;

  const { t } = useTranslation();

  return (
    <>
      <ContextMenu parentRef={parentRef} items={MENU_ITEMS} />
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
              onClick={() => {
                item.action();
              }}
              disabled={item.disabled}
            />
          ))}
        </MenuContent>
      </Menu>
    </>
  );
});
