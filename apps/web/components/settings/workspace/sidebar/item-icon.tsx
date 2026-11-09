/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IconGlyph } from "@makestrata/propel/components/icon";
import {
  BillingsOutline,
  BuildingOutline,
  ExportOutline,
  MembersOutline,
  WebhooksOutline,
} from "@makestrata/propel/icons";
// strata imports
import type { ISvgIcons } from "@strata/blocks/icons";
import type { TWorkspaceSettingsTabs } from "@strata/types";

export const WORKSPACE_SETTINGS_ICONS: Record<TWorkspaceSettingsTabs, IconGlyph | React.FC<ISvgIcons>> = {
  general: BuildingOutline,
  members: MembersOutline,
  export: ExportOutline,
  "billing-and-plans": BillingsOutline,
  webhooks: WebhooksOutline,
};
