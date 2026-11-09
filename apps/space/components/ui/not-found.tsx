/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { EmptyStateDetailed } from "@strata/blocks/empty-state";

export function PageNotFound() {
  return (
    <div className="h-screen w-full overflow-hidden bg-surface-1 p-4">
      <EmptyStateDetailed
        align="center"
        assetKey="error-404"
        assetClassName="size-40"
        title="Oops! Something went wrong."
        description="Sorry, the page you are looking for cannot be found. It may have been removed, had its name changed, or is temporarily unavailable."
      />
    </div>
  );
}
