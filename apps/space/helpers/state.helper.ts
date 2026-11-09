/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { STATE_GROUPS } from "@strata/constants";
import type { IState } from "@strata/types";

export const sortStates = (states: IState[]) => {
  if (!states || states.length === 0) return;

  const sortedStates = [...states];
  // Sorting a defensive copy keeps the caller's state immutable while remaining
  // compatible with the application's pre-ES2023 browser target.
  // eslint-disable-next-line unicorn/no-array-sort
  return sortedStates.sort((stateA, stateB) => {
    if (stateA.group === stateB.group) {
      return stateA.sequence - stateB.sequence;
    }
    return Object.keys(STATE_GROUPS).indexOf(stateA.group) - Object.keys(STATE_GROUPS).indexOf(stateB.group);
  });
};
