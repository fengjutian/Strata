/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import path from "node:path";

// Plain object config: `vite` is not a direct dependency of this package, so it cannot be imported here.
export default {
  root: import.meta.dirname,
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "../src") },
  },
  // The workspace packages read `process.env.VITE_*`, which only exists under Node.
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "process.env": "{}",
  },
  server: {
    port: 5199,
    strictPort: true,
  },
};
