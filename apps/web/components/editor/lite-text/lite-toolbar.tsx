/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type React from "react";
// strata imports
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { AttachOutline, TopArrowOutline } from "@makestrata/propel/icons";
import type { ToolbarMenuItem } from "@strata/editor";
import { IMAGE_ITEM } from "@strata/editor";
import { useTranslation } from "@strata/i18n";

type LiteToolbarProps = {
  onSubmit: (e: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>) => void;
  isSubmitting: boolean;
  isEmpty: boolean;
  executeCommand: (item: ToolbarMenuItem) => void;
};

export function LiteToolbar({ onSubmit, isSubmitting, isEmpty, executeCommand }: LiteToolbarProps) {
  // strata hooks
  const { t } = useTranslation();

  return (
    <div className="flex h-6 items-center gap-1.5">
      <span className="h-4 shrink-0 border-l border-subtle-1" />
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        icon={<Icon icon={AttachOutline} />}
        aria-label={t("attach")}
        onClick={() => executeCommand(IMAGE_ITEM)}
      />
      <IconButton
        type="button"
        variant="primary"
        size="xs"
        icon={<Icon icon={TopArrowOutline} />}
        aria-label={t("submit")}
        onClick={(e) => onSubmit(e)}
        disabled={isEmpty || isSubmitting}
      />
    </div>
  );
}

export type { LiteToolbarProps };
