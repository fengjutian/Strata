/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { SelectField } from "@makestrata/propel/components/select-field";
import { START_OF_THE_WEEK_OPTIONS } from "@strata/constants";
import { setToast } from "@strata/blocks/toast";
import type { EStartOfTheWeek } from "@strata/types";
// components
import { SettingsControlItem } from "@/components/settings/control-item";
// hooks
import { useUserProfile } from "@/hooks/store/user";

export const StartOfWeekPreference = observer(function StartOfWeekPreference(props: {
  option: { title: string; description: string };
}) {
  // hooks
  const { data: userProfile, updateUserProfile } = useUserProfile();

  const handleStartOfWeekChange = async (val: EStartOfTheWeek) => {
    try {
      await updateUserProfile({ start_of_the_week: val });
      setToast({ type: "success", title: "Success", message: "First day of the week updated successfully" });
    } catch (_error) {
      setToast({ type: "error", title: "Update failed", message: "Please try again later." });
    }
  };

  return (
    <SettingsControlItem
      title={props.option.title}
      description={props.option.description}
      control={
        <SelectField<EStartOfTheWeek>
          aria-label={props.option.title}
          size="md"
          width="fit"
          options={START_OF_THE_WEEK_OPTIONS}
          value={userProfile.start_of_the_week}
          onValueChange={(value) => {
            if (value !== null) void handleStartOfWeekChange(value);
          }}
        />
      }
    />
  );
});
