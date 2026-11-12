/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import { areActiveStatesEqual } from "../common";

describe("areActiveStatesEqual", () => {
  it("treats identical states as equal", () => {
    expect(areActiveStatesEqual({ bold: true, italic: false }, { bold: true, italic: false })).toBe(true);
  });

  it("detects a changed state", () => {
    expect(areActiveStatesEqual({ bold: true, italic: false }, { bold: false, italic: false })).toBe(false);
  });

  it("detects an added or removed state", () => {
    expect(areActiveStatesEqual({ bold: true }, { bold: true, italic: false })).toBe(false);
    expect(areActiveStatesEqual({ bold: true, italic: false }, { bold: true })).toBe(false);
  });

  it("treats two empty maps as equal", () => {
    expect(areActiveStatesEqual({}, {})).toBe(true);
  });

  it("does not treat a missing key as a false state", () => {
    expect(areActiveStatesEqual({ bold: false }, {})).toBe(false);
  });
});
