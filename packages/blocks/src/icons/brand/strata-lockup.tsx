/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import { STRATA_MARK_DATA_URI } from "./strata-mark-data";

export type StrataLockupProps = React.ComponentPropsWithoutRef<"svg">;

/**
 * Official Strata lockup: brand mark + "Strata" wordmark.
 *
 * Kept as a single SVG so every call site can size it with `h-*`/`w-*` classes
 * (the viewBox does the scaling) and colour it with `currentColor`. Replace the
 * <text> node with official letterforms when the vector wordmark is available.
 */
export function StrataLockup({ width = "253", height = "53", className, color = "currentColor" }: StrataLockupProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 253 53"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
      role="img"
      aria-label="Strata"
    >
      <image href={STRATA_MARK_DATA_URI} x="0" y="0.5" width="55" height="52" preserveAspectRatio="xMinYMid meet" />
      <text
        x="66"
        y="39.5"
        fill="currentColor"
        fontFamily="'Inter Variable', Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="39"
        fontWeight="600"
        letterSpacing="-1"
      >
        Strata
      </text>
    </svg>
  );
}
