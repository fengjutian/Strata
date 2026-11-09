/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// icons
// strata imports
import { EIconSize } from "@strata/constants";
import { StateGroupIcon } from "@strata/blocks/icons";
import type { IState } from "@strata/types";
import { RemovableChip } from "@/components/common/removable-chip";

type Props = {
  handleRemove: (val: string) => void;
  states: IState[];
  values: string[];
  editable: boolean | undefined;
};

export const AppliedStateFilters = observer(function AppliedStateFilters(props: Props) {
  const { handleRemove, states, values, editable } = props;

  return (
    <>
      {values.map((stateId) => {
        const stateDetails = states?.find((s) => s.id === stateId);

        if (!stateDetails) return null;

        return (
          <RemovableChip
            key={stateId}
            variant="soft"
            icon={
              <StateGroupIcon
                color={stateDetails.color}
                stateGroup={stateDetails.group}
                size={EIconSize.SM}
                percentage={stateDetails?.order}
              />
            }
            label={stateDetails.name}
            ariaLabel={stateDetails.name}
            onRemove={editable ? () => handleRemove(stateId) : undefined}
          />
        );
      })}
    </>
  );
});
