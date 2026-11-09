/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { CORE_EXTENSIONS } from "@strata/utils";
// strata editor imports
import type { ExtensionFileSetStorageKey } from "@/types/storage";

export type NodeFileMapType = Partial<
  Record<
    CORE_EXTENSIONS.IMAGE | CORE_EXTENSIONS.CUSTOM_IMAGE,
    {
      fileSetName: ExtensionFileSetStorageKey;
    }
  >
>;

export const NODE_FILE_MAP: NodeFileMapType = {
  [CORE_EXTENSIONS.IMAGE]: {
    fileSetName: "deletedImageSet",
  },
  [CORE_EXTENSIONS.CUSTOM_IMAGE]: {
    fileSetName: "deletedImageSet",
  },
};
