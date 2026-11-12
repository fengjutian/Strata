/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";

let editor: Editor;

afterEach(() => {
  editor?.destroy();
  vi.restoreAllMocks();
});

describe("update event serialization", () => {
  it("fires update only when the document changed", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "<p>hello</p><p>world</p>",
      extensions: [StarterKit],
    });

    let updateCount = 0;
    editor.on("update", () => {
      updateCount++;
    });

    editor.commands.setTextSelection(2);
    editor.commands.setTextSelection(4);

    expect(updateCount).toBe(0);
  });

  it("fires update once per document change", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "<p>hello</p>",
      extensions: [StarterKit],
    });

    let updateCount = 0;
    editor.on("update", () => {
      updateCount++;
    });

    editor.commands.insertContentAt(1, "x");

    expect(updateCount).toBe(1);
  });

  it("does not serialize the document for a selection-only transaction", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "<p>hello</p><p>world</p>",
      extensions: [StarterKit],
    });

    const getJSON = vi.spyOn(Editor.prototype, "getJSON");
    const getHTML = vi.spyOn(Editor.prototype, "getHTML");

    editor.on("update", () => {
      editor.getJSON();
      editor.getHTML();
    });

    editor.commands.setTextSelection(2);

    expect(getJSON).not.toHaveBeenCalled();
    expect(getHTML).not.toHaveBeenCalled();
  });
});
