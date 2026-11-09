/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import { STRATA_MARK_DATA_URI } from "./strata-mark-data";

export type StrataLogoProps = Omit<React.ComponentPropsWithoutRef<"img">, "src" | "alt">;

/**
 * Strata brand mark. Rendered from the official artwork (raster), so it keeps the
 * original gradient instead of a flat `currentColor` fill. Sizing works through the
 * usual `h-*`/`w-*` classes — the width/height props only provide the default ratio.
 */
export function StrataLogo({ height = 52, width, className, ...props }: StrataLogoProps) {
  return <img src={STRATA_MARK_DATA_URI} alt="Strata" height={height} width={width} className={className} {...props} />;
}
