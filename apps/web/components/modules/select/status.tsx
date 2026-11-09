/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";

// react hook form
import type { FieldError, Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { StateOutline } from "@makestrata/propel/icons";
import { ModuleStatusIcon } from "@strata/blocks/icons";
import type { TModuleStatus } from "@strata/blocks/icons";
import { Select } from "@strata/blocks/select";
import { MODULE_STATUS } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import type { IModule } from "@strata/types";
import { cn } from "@strata/utils";

type ModuleStatusOption = (typeof MODULE_STATUS)[number];

type Props = {
  control: Control<IModule, any>;
  error?: FieldError;
  tabIndex?: number;
};

export function ModuleStatusSelect({ control, error, tabIndex }: Props) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      rules={{ required: true }}
      name="status"
      render={({ field: { value, onChange } }) => {
        const selectedValue = MODULE_STATUS.find((s) => s.value === value) ?? null;
        return (
          <Select<ModuleStatusOption>
            getValues={() => MODULE_STATUS}
            value={selectedValue}
            onChange={(val) => onChange(val as TModuleStatus)}
            getOptionValue={(status) => status.value}
            getOptionLabel={(status) => t(status.i18n_label)}
            getOptionIcon={(status) => <ModuleStatusIcon status={status.value} />}
            showSearch={false}
            pinSelected={false}
          >
            <Select.Trigger
              variant="pill-sm"
              className={cn("min-h-0", error && "text-danger-primary")}
              tabIndex={tabIndex}
              appendIcon={null}
              prependIcon={
                value ? (
                  <ModuleStatusIcon status={value} />
                ) : (
                  <StateOutline aria-hidden="true" className={error ? "text-danger-primary" : "text-secondary"} />
                )
              }
            >
              {selectedValue ? (
                t(selectedValue.i18n_label)
              ) : (
                <span className={error ? "text-danger-primary" : "text-secondary"}>Status</span>
              )}
            </Select.Trigger>
          </Select>
        );
      }}
    />
  );
}
