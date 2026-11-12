/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// import CodeBlock, { CodeBlockOptions } from "@tiptap/extension-code-block";

import type { CodeBlockOptions } from "./code-block";
import { CodeBlock } from "./code-block";
import { LOWLIGHT_PLUGIN_MARKER, LowlightPlugin } from "./lowlight-plugin";

type CodeBlockLowlightOptions = CodeBlockOptions & {
  lowlight: any;
  defaultLanguage: string | null | undefined;
};

export const CodeBlockLowlight = CodeBlock.extend<CodeBlockLowlightOptions>({
  addOptions() {
    return {
      ...(this.parent?.() ?? {
        languageClassPrefix: "language-",
        exitOnTripleEnter: true,
        exitOnArrowDown: true,
        HTMLAttributes: {},
      }),
      lowlight: {},
      defaultLanguage: null,
    };
  },

  addProseMirrorPlugins() {
    // In Tiptap v3 `this.parent` resolves to the parent's complete `addProseMirrorPlugins`, not just to
    // the plugins that are missing here. When this extension is extended further (for example
    // `CodeBlockLowlight.extend(...)`) the parent therefore already contributes a lowlight plugin, and
    // registering it a second time doubles the full-document scan the plugin performs on every transaction.
    const parentPlugins = this.parent?.() || [];
    const hasLowlightPlugin = parentPlugins.some((plugin) => plugin.spec[LOWLIGHT_PLUGIN_MARKER]);

    return [
      ...parentPlugins,
      ...(hasLowlightPlugin
        ? []
        : [
            LowlightPlugin({
              name: this.name,
              lowlight: this.options.lowlight,
              defaultLanguage: this.options.defaultLanguage,
            }),
          ]),
    ];
  },
});
