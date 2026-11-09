/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { CycleSelect } from "@strata/blocks/property-select";
import type { CycleOption } from "@strata/blocks/property-select";
import type { SelectVariant } from "@strata/blocks/select";
import { useTranslation } from "@strata/i18n";
import type { TCycleGroups } from "@strata/types";
import { cn } from "@strata/utils";
// helpers
import { READ_ONLY_SELECT_CLASSNAME, toSinglePage } from "@/helpers/select.helper";
// hooks
import { useCycle } from "@/hooks/store/use-cycle";
// types
import type { TPublicCycle } from "@/types/cycle";

const CYCLE_GROUPS: TCycleGroups[] = ["current", "upcoming", "completed", "draft"];

type Props = {
  cycleId: string | undefined;
  variant?: SelectVariant;
  className?: string;
};

const toCycleOption = (cycle: TPublicCycle): CycleOption => {
  const status = cycle.status?.toLowerCase();
  return {
    id: cycle.id,
    name: cycle.name,
    status: CYCLE_GROUPS.find((group) => group === status),
  };
};

/** The work item cycle as a read-only `CycleSelect` chip. */
export const IssueBlockCycle = observer(function IssueBlockCycle(props: Props) {
  const { cycleId, variant = "pill-md", className } = props;
  // i18n
  const { t } = useTranslation();
  // store hooks
  const { cycles, getCycleById } = useCycle();
  // derived values
  const cycle = getCycleById(cycleId);

  return (
    <CycleSelect
      getValues={() => toSinglePage(cycles?.map(toCycleOption))}
      value={cycle ? toCycleOption(cycle) : null}
      onChange={() => {}}
      variant={variant}
      placeholder={t("common.cycle")}
      className={cn(READ_ONLY_SELECT_CLASSNAME, className)}
      tooltip={{ heading: t("common.cycle"), emptyContent: t("common.none") }}
      clearable={false}
      disabled
    />
  );
});
