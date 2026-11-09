/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import { STRATA_LOCKUP_ARTWORK_DATA_URI } from "./strata-lockup-artwork-data";

export type StrataLockupProps = Omit<React.ComponentPropsWithoutRef<"img">, "src" | "alt">;

// Artwork aspect ratio (1366x487), used when only `height` is supplied.
const ARTWORK_ASPECT = 1366 / 487;

/**
 * Official Strata lockup — the supplied artwork, used as-is (mark + wordmark and
 * its own backdrop/glow). Sizing goes through `height`, `width` or the usual
 * `h-*`/`w-*` classes.
 */
export function StrataLockup({ height = 53, width, className, ...props }: StrataLockupProps) {
  const pixelHeight = typeof height === "number" ? height : Number(height) || 53;

  return (
    <img
      src={STRATA_LOCKUP_ARTWORK_DATA_URI}
      alt="Strata"
      height={height}
      width={width ?? Math.round(pixelHeight * ARTWORK_ASPECT)}
      className={className}
      {...props}
    />
  );
}
