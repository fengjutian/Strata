/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { getEditorMenuItems } from "../menu-items";

let editor: Editor;

const createEditor = (content: string) => {
  editor = new Editor({
    element: document.createElement("div"),
    content,
    extensions: [StarterKit],
  });
  return editor;
};

const isActive = (key: string) => {
  const item = getEditorMenuItems(editor).find((entry) => entry.key === key);
  return item?.isActive();
};

afterEach(() => {
  editor?.destroy();
});

describe("getEditorMenuItems", () => {
  it("returns the same array for the same editor", () => {
    createEditor("<p>body</p>");

    // The toolbar rebuilds its states on every transaction, and building the menu for every item
    // turned one recomputation into fourteen menu constructions.
    expect(getEditorMenuItems(editor)).toBe(getEditorMenuItems(editor));
  });

  it("returns a separate array for every editor", () => {
    const first = createEditor("<p>body</p>");
    const firstItems = getEditorMenuItems(first);
    const second = createEditor("<p>body</p>");

    expect(getEditorMenuItems(second)).not.toBe(firstItems);
  });

  it("returns an empty list without an editor", () => {
    expect(getEditorMenuItems(null)).toEqual([]);
  });

  it("reads the live editor state instead of a snapshot", () => {
    createEditor("<p>body</p>");

    expect(isActive("bold")).toBe(false);

    editor.commands.setTextSelection(2);
    editor.commands.toggleBold();

    expect(isActive("bold")).toBe(true);
  });

  it("reflects a changed node type", () => {
    createEditor("<h2>Title</h2>");

    expect(isActive("h2")).toBe(true);
    expect(isActive("text")).toBe(false);
  });
});
