/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { EIconSize } from "@strata/constants";
import { StateGroupIcon } from "@strata/blocks/icons";
import { useTranslation } from "@strata/i18n";
import { CloseOutline } from "@makestrata/propel/icons";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
// hooks
import { useStates } from "@/hooks/store/use-state";

type Props = {
  handleRemove: (val: string) => void;
  values: string[];
};

export const AppliedStateFilters = observer(function AppliedStateFilters(props: Props) {
  const { handleRemove, values } = props;
  const { t } = useTranslation();

  const { sortedStates: states } = useStates();

  return (
    <>
      {values.map((stateId) => {
        const stateDetails = states?.find((s) => s.id === stateId);

        if (!stateDetails) return null;

        return (
          <div key={stateId} className="flex items-center gap-1 rounded-sm bg-layer-3 p-1 text-caption-sm-regular">
            <StateGroupIcon color={stateDetails.color} stateGroup={stateDetails.group} size={EIconSize.SM} />
            {stateDetails.name}
            <IconButton
              variant="ghost"
              size="xs"
              aria-label={`${t("common.remove")} ${stateDetails.name}`}
              showTooltip={false}
              icon={<Icon icon={CloseOutline} />}
              onClick={() => handleRemove(stateId)}
            />
          </div>
        );
      })}
    </>
  );
});
