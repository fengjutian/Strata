/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IconGlyph } from "@makestrata/propel/components/icon";
import {
  CyclesOutline,
  EstimateOutline,
  IntakeOutline,
  LabelsOutline,
  MembersOutline,
  ModuleOutline,
  PagesOutline,
  StateOutline,
  TriggerOutline,
  ViewsOutline,
} from "@makestrata/propel/icons";
// strata imports
import type { ISvgIcons } from "@strata/blocks/icons";
import type { TProjectSettingsTabs } from "@strata/types";
// components
import { SettingIcon } from "@/components/icons/attachment";

export const PROJECT_SETTINGS_ICONS: Record<TProjectSettingsTabs, IconGlyph | React.FC<ISvgIcons>> = {
  general: SettingIcon,
  members: MembersOutline,
  features_cycles: CyclesOutline,
  features_modules: ModuleOutline,
  features_views: ViewsOutline,
  features_pages: PagesOutline,
  features_intake: IntakeOutline,
  states: StateOutline,
  labels: LabelsOutline,
  estimates: EstimateOutline,
  automations: TriggerOutline,
};
