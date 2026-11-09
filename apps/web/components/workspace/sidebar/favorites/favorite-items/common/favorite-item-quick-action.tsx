/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Icon } from "@makestrata/propel/components/icon";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makestrata/propel/components/menu";
import { MoreHorizontalOutline, StarFilled } from "@makestrata/propel/icons";
// strata imports
import { useTranslation } from "@strata/i18n";
import type { IFavorite } from "@strata/types";
// helpers
import { cn } from "@strata/utils";

type Props = {
  ref: React.MutableRefObject<HTMLDivElement | null>;
  isMenuActive: boolean;
  favorite: IFavorite;
  onChange: (value: boolean) => void;
  handleRemoveFromFavorites: (favorite: IFavorite) => void;
};

export const FavoriteItemQuickAction = observer(function FavoriteItemQuickAction(props: Props) {
  const { ref, isMenuActive, onChange, handleRemoveFromFavorites, favorite } = props;
  // translation
  const { t } = useTranslation();

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none flex-shrink-0 opacity-0 group-focus-within/project-item:pointer-events-auto group-focus-within/project-item:opacity-100 group-hover/project-item:pointer-events-auto group-hover/project-item:opacity-100",
        {
          "pointer-events-auto opacity-100": isMenuActive,
        }
      )}
    >
      <Menu onOpenChange={onChange}>
        <MenuTrigger
          render={
            <IconButton
              variant="ghost"
              size="xs"
              showTooltip={false}
              aria-label={t("aria_labels.projects_sidebar.toggle_quick_actions_menu")}
              icon={<Icon icon={MoreHorizontalOutline} />}
            />
          }
        />
        <MenuContent side="bottom" align="start">
          <MenuItem
            icon={<Icon icon={<StarFilled className="text-label-yellow-icon-strong" />} />}
            label={t("remove_from_favorites")}
            onClick={() => handleRemoveFromFavorites(favorite)}
          />
        </MenuContent>
      </Menu>
    </div>
  );
});
