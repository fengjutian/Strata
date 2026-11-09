/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { LinkOutline, StarOffOutline, StarOutline } from "@makestrata/propel/icons";
// strata imports
import { EUserPermissions, EUserPermissionsLevel } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { setToast } from "@strata/blocks/toast";
import { copyTextToClipboard } from "@strata/utils";
// components
import type { TPowerKCommandConfig } from "@/components/power-k/core/types";
// hooks
import { useCycle } from "@/hooks/store/use-cycle";
import { useUser } from "@/hooks/store/user";

export const usePowerKCycleContextBasedActions = (): TPowerKCommandConfig[] => {
  // navigation
  const { workspaceSlug, cycleId } = useParams();
  // store
  const {
    permission: { allowPermissions },
  } = useUser();
  const { getCycleById, addCycleToFavorites, removeCycleFromFavorites } = useCycle();
  // derived values
  const cycleDetails = cycleId ? getCycleById(cycleId.toString()) : null;
  const isFavorite = !!cycleDetails?.is_favorite;
  // permission
  const isEditingAllowed =
    allowPermissions([EUserPermissions.ADMIN, EUserPermissions.MEMBER], EUserPermissionsLevel.PROJECT) &&
    !cycleDetails?.archived_at;
  // translation
  const { t } = useTranslation();

  const toggleFavorite = useCallback(() => {
    if (!workspaceSlug || !cycleDetails || !cycleDetails.project_id) return;
    try {
      if (isFavorite) removeCycleFromFavorites(workspaceSlug.toString(), cycleDetails.project_id, cycleDetails.id);
      else addCycleToFavorites(workspaceSlug.toString(), cycleDetails.project_id, cycleDetails.id);
    } catch {
      setToast({
        type: "error",
        title: "Some error occurred",
      });
    }
  }, [addCycleToFavorites, removeCycleFromFavorites, workspaceSlug, cycleDetails, isFavorite]);

  const copyCycleUrlToClipboard = useCallback(() => {
    const url = new URL(window.location.href);
    copyTextToClipboard(url.href)
      .then(() => {
        setToast({
          type: "success",
          title: t("power_k.contextual_actions.cycle.copy_url_toast_success"),
        });
      })
      .catch(() => {
        setToast({
          type: "error",
          title: t("power_k.contextual_actions.cycle.copy_url_toast_error"),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [
    {
      id: "toggle_cycle_favorite",
      i18n_title: isFavorite
        ? "power_k.contextual_actions.cycle.remove_from_favorites"
        : "power_k.contextual_actions.cycle.add_to_favorites",
      icon: isFavorite ? StarOffOutline : StarOutline,
      group: "contextual",
      contextType: "cycle",
      type: "action",
      action: toggleFavorite,
      modifierShortcut: "shift+f",
      isEnabled: () => isEditingAllowed,
      isVisible: () => isEditingAllowed,
      closeOnSelect: true,
    },
    {
      id: "copy_cycle_url",
      i18n_title: "power_k.contextual_actions.cycle.copy_url",
      icon: LinkOutline,
      group: "contextual",
      contextType: "cycle",
      type: "action",
      action: copyCycleUrlToClipboard,
      modifierShortcut: "cmd+shift+,",
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
  ];
};
