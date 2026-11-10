/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import { clampPeekWidth, PEEK_MAX_WIDTH, PEEK_MIN_WIDTH } from "./use-resizable-peek";

describe("work item peek width", () => {
  it("enforces the minimum width", () => {
    expect(clampPeekWidth(100, 1440)).toBe(PEEK_MIN_WIDTH);
  });

  it("leaves enough room for the work item list", () => {
    expect(clampPeekWidth(1000, 1024)).toBe(704);
  });

  it("enforces the absolute maximum width", () => {
    expect(clampPeekWidth(1600, 1920)).toBe(PEEK_MAX_WIDTH);
  });
});
