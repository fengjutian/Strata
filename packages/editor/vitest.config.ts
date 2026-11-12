/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "happy-dom",
    server: {
      deps: {
        /**
         * `prosemirror-codemark` ships CommonJS only, so Node loads it and its `prosemirror-state` /
         * `prosemirror-view` imports on the CJS side, while `@tiptap/pm/*` ships sources that Vite bundles
         * on the ESM side. Node keeps the ESM and the CJS module cache apart, so the editor ends up with two
         * copies of ProseMirror: plugin keys collide and decoration sets are rejected.
         * Inlining the packages routes every import through Vite, so there is a single copy.
         */
        inline: [/prosemirror-codemark/, /prosemirror-view/, /prosemirror-state/, /prosemirror-model/],
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
