/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { StrataLogo } from "@strata/blocks/icons";

export function LogoSpinner() {
  return (
    <div className="flex items-center justify-center" role="status" aria-label="Loading">
      <StrataLogo className="h-8 w-auto motion-safe:animate-pulse sm:h-11" />
    </div>
  );
}
