/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IconGlyph } from "@makestrata/propel/components/icon";

export type TSidebarMenuItem = {
  Icon: IconGlyph;
  name: string;
  /** Shown as the row's tooltip; the sidebar renders names only. */
  description: string;
  href: string;
};
