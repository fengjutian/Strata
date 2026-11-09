/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { PriorityIcon } from "@strata/blocks/icons";
import { useTranslation } from "@strata/i18n";
import { CloseOutline } from "@makestrata/propel/icons";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import type { TIssuePriorities } from "@strata/blocks/icons";

type Props = {
  handleRemove: (val: string) => void;
  values: TIssuePriorities[];
};

export function AppliedPriorityFilters(props: Props) {
  const { handleRemove, values } = props;
  const { t } = useTranslation();

  return (
    <>
      {values?.map((priority) => (
        <div key={priority} className="flex items-center gap-1 rounded-sm bg-layer-3 p-1 text-caption-sm-regular">
          <PriorityIcon priority={priority} className={`h-3 w-3`} />
          {priority}
          <IconButton
            variant="ghost"
            size="xs"
            aria-label={`${t("common.remove")} ${priority}`}
            showTooltip={false}
            icon={<Icon icon={CloseOutline} />}
            onClick={() => handleRemove(priority)}
          />
        </div>
      ))}
    </>
  );
}
