/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { getHeadingsFromState, HeadingListExtension } from "../headings-list";

let editor: Editor;

const createEditor = (content: string) => {
  editor = new Editor({
    element: document.createElement("div"),
    content,
    extensions: [StarterKit, HeadingListExtension],
  });
  return editor;
};

// The plugin state is the source of truth; the extension storage is a mirror kept in sync.
const headings = () => getHeadingsFromState(editor);
const storageHeadings = () => editor.storage.headingsList?.headings ?? [];

afterEach(() => {
  editor?.destroy();
});

describe("HeadingListExtension", () => {
  it("collects headings with levels and per-level sequences", () => {
    createEditor("<h1>One</h1><p>body</p><h2>Two</h2><h2>Three</h2><h1>Four</h1>");

    expect(headings()).toEqual([
      { type: "heading", level: 1, text: "One", sequence: 1 },
      { type: "heading", level: 2, text: "Two", sequence: 1 },
      { type: "heading", level: 2, text: "Three", sequence: 2 },
      { type: "heading", level: 1, text: "Four", sequence: 2 },
    ]);
  });

  it("updates the heading list when a heading is added", () => {
    createEditor("<p>body</p>");

    editor.commands.insertContentAt(1, {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "New" }],
    });

    expect(headings()).toEqual([{ type: "heading", level: 2, text: "New", sequence: 1 }]);
  });

  it("emits headingsChange only when the heading list actually changes", () => {
    createEditor("<h1>One</h1>");

    const events: number[] = [];
    editor.on("headingsChange", (payload) => events.push(payload.headings.length));

    // typing inside the heading changes its text -> the list changes
    editor.commands.insertContentAt(3, "X");
    expect(events.length).toBe(1);

    // typing inside a plain paragraph must not change the heading list
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, { type: "paragraph" });
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, "plain text");
    expect(events.length).toBe(1);
  });

  it("does not emit an update event for selection-only transactions", () => {
    createEditor("<h1>One</h1><p>body</p>");

    let updateCount = 0;
    editor.on("update", () => {
      updateCount++;
    });

    editor.commands.setTextSelection(3);
    editor.commands.setTextSelection(6);

    // A selection change must not trigger the `update` event, which is what forces consumers to
    // serialize the whole document.
    expect(updateCount).toBe(0);
  });

  it("keeps the heading list stable across selection-only transactions", () => {
    createEditor("<h1>One</h1><p>body</p>");

    const before = headings();
    editor.commands.setTextSelection(6);

    expect(headings()).toEqual(before);
  });

  it("exposes the same heading list through the plugin state and the storage mirror", () => {
    createEditor("<h1>One</h1><p>body</p>");

    // The storage mirror must be populated from the start, otherwise consumers that read it before the
    // first transaction would see an empty list.
    expect(storageHeadings()).toEqual(headings());
    expect(storageHeadings()).toEqual([{ type: "heading", level: 1, text: "One", sequence: 1 }]);

    editor.commands.insertContentAt(editor.state.doc.content.size - 1, {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Two" }],
    });

    expect(storageHeadings()).toEqual(headings());
    expect(storageHeadings()).toHaveLength(2);
  });

  it("reports the current headings to onHeadingChange consumers", () => {
    createEditor("<h1>One</h1>");

    const received: number[] = [];
    editor.on("headingsChange", (payload) => received.push(payload.headings.length));

    editor.commands.insertContentAt(editor.state.doc.content.size - 1, {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Two" }],
    });

    expect(received).toEqual([2]);
  });
});
