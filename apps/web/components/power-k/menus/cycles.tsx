/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// strata imports
import { CyclesOutline } from "@makestrata/propel/icons";
import type { ICycle } from "@strata/types";
// local imports
import { PowerKMenuBuilder } from "./builder";

type Props = {
  cycles: ICycle[];
  onSelect: (cycle: ICycle) => void;
  value?: string | null;
};

export const PowerKCyclesMenu = observer(function PowerKCyclesMenu({ cycles, onSelect, value }: Props) {
  return (
    <PowerKMenuBuilder
      items={cycles}
      getIcon={() => CyclesOutline}
      getKey={(cycle) => cycle.id}
      getValue={(cycle) => cycle.name}
      getLabel={(cycle) => cycle.name}
      isSelected={(cycle) => value === cycle.id}
      onSelect={onSelect}
      emptyText="No cycles found"
    />
  );
});
