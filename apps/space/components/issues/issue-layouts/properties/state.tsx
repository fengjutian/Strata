/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { StateSelect } from "@strata/blocks/property-select";
import type { StateOption } from "@strata/blocks/property-select";
import type { SelectVariant } from "@strata/blocks/select";
import { useTranslation } from "@strata/i18n";
import { cn } from "@strata/utils";
// helpers
import { READ_ONLY_SELECT_CLASSNAME, toSinglePage } from "@/helpers/select.helper";
// hooks
import { useStates } from "@/hooks/store/use-state";

type Props = {
  stateId: string | undefined;
  variant?: SelectVariant;
  className?: string;
};

/** The work item state as a read-only `StateSelect` chip. */
export const IssueBlockState = observer(function IssueBlockState(props: Props) {
  const { stateId, variant = "pill-md", className } = props;
  // i18n
  const { t } = useTranslation();
  // store hooks
  const { sortedStates, getStateById } = useStates();
  // derived values
  const state = getStateById(stateId);
  if (!state) return null;

  const value: StateOption = { id: state.id, name: state.name, color: state.color, group: state.group };

  return (
    <StateSelect
      getValues={() => toSinglePage(sortedStates)}
      value={value}
      onChange={() => {}}
      variant={variant}
      className={cn(READ_ONLY_SELECT_CLASSNAME, className)}
      tooltip={{ heading: t("common.state") }}
      disabled
    />
  );
});
