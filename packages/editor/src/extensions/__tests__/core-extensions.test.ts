/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { CoreEditorExtensions } from "../extensions";

let editor: Editor | undefined;

/** `Plugin.key` is read at runtime but is not part of the public ProseMirror types. */
const pluginKey = (plugin: unknown) => (plugin as { key: string }).key;

const createEditor = () => {
  editor = new Editor({
    element: document.createElement("div"),
    content: "<p>Paragraph</p><p></p><table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>",
    extensions: CoreEditorExtensions({
      disabledExtensions: [],
      editable: true,
      enableHistory: false,
      extendedEditorProps: {},
      fileHandler: {} as never,
      flaggedExtensions: [],
      getEditorMetaData: (() => ({})) as never,
      isTouchDevice: false,
      mentionHandler: {
        searchCallback: async () => ({ results: [] }),
        renderComponent: () => null,
        getMentionedEntityDetails: async () => null,
      } as never,
      placeholder: undefined,
      showPlaceholderOnEmpty: false,
      tabIndex: undefined,
      provider: undefined,
    }),
  });

  return editor;
};

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe("CoreEditorExtensions", () => {
  it("builds an editor with the complete extension set", () => {
    const instance = createEditor();

    expect(instance.view.state.plugins.length).toBeGreaterThan(50);
    expect(instance.getText()).toContain("Paragraph");
  });

  it("never registers two plugins under the same key", () => {
    const instance = createEditor();
    const keys = instance.view.state.plugins.map(pluginKey);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("registers the lowlight plugin exactly once", () => {
    const instance = createEditor();
    const lowlightPlugins = instance.view.state.plugins.filter((plugin) => pluginKey(plugin).startsWith("lowlight"));

    // The lowlight plugin walks the whole document on every transaction, so a second registration
    // doubles that cost for no benefit.
    expect(lowlightPlugins).toHaveLength(1);
  });
});
