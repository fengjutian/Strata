/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import { createDiceBearAvatarDataUri, DICEBEAR_AVATAR_STYLES } from "./dicebear-avatar.helper";

describe("DiceBear avatar helper", () => {
  it("offers unique avatar styles", () => {
    const keys = DICEBEAR_AVATAR_STYLES.map(({ key }) => key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("creates a deterministic SVG data URI", () => {
    const first = createDiceBearAvatarDataUri("lorelei", "workspace-one");
    const second = createDiceBearAvatarDataUri("lorelei", "workspace-one");

    expect(first).toBe(second);
    expect(first).toMatch(/^data:image\/svg\+xml/);
  });

  it("uses a stable fallback for an empty seed", () => {
    expect(createDiceBearAvatarDataUri("shapes", " ")).toBe(createDiceBearAvatarDataUri("shapes", "workspace"));
  });
});
