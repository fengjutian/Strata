/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { EEstimateSystem } from "@strata/constants";
import { ProjectsOutline } from "@makestrata/propel/icons";
import type { ChartYAxisMetric } from "@strata/types";
// strata package imports
import { Select } from "@strata/blocks/select";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
// strata web constants
type YAxisOption = { value: ChartYAxisMetric; label: string };

type Props = {
  value: ChartYAxisMetric;
  onChange: (val: ChartYAxisMetric | null) => void;
  hiddenOptions?: ChartYAxisMetric[];
  options: { value: ChartYAxisMetric; label: string }[];
};

export const SelectYAxis = observer(function SelectYAxis({ value, onChange, hiddenOptions, options }: Props) {
  // hooks
  const { projectId } = useParams();
  const { areEstimateEnabledByProjectId, currentActiveEstimateId, estimateById } = useProjectEstimates();

  const isEstimateEnabled = (analyticsOption: string) => {
    if (analyticsOption === "estimate") {
      if (
        projectId &&
        currentActiveEstimateId &&
        areEstimateEnabledByProjectId(projectId.toString()) &&
        estimateById(currentActiveEstimateId)?.type === EEstimateSystem.POINTS
      ) {
        return true;
      } else {
        return false;
      }
    }

    return true;
  };

  // derived values
  // computed on every render (not memoised): `isEstimateEnabled` reads observable estimate state
  const hiddenSet = new Set(hiddenOptions);
  const selectOptions: YAxisOption[] = options.filter(
    (item) => !hiddenSet.has(item.value) && isEstimateEnabled(item.value)
  );
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  return (
    <Select<YAxisOption>
      getValues={() => selectOptions}
      value={selected}
      onChange={(val) => onChange(options.find((option) => option.value === val)?.value ?? null)}
      getOptionValue={(option) => option.value}
      getOptionLabel={(option) => option.label}
      showSearch={false}
      pinSelected={false}
    >
      <Select.Trigger variant="select-md" className="w-auto">
        <div className="flex items-center gap-2">
          <ProjectsOutline className="h-3 w-3" />
          <span>{selected?.label ?? "Add Metric"}</span>
        </div>
      </Select.Trigger>
    </Select>
  );
});
