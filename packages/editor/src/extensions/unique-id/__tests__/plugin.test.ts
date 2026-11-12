/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { UniqueID } from "../extension";

let editor: Editor;
let generated = 0;

const generateUniqueID = () => `generated-${generated++}`;

const createEditor = (content: string) => {
  generated = 0;
  editor = new Editor({
    element: document.createElement("div"),
    content,
    extensions: [StarterKit, UniqueID.configure({ types: ["paragraph"], generateUniqueID })],
  });
  return editor;
};

/** Counts how often the document is walked, which is what the duplicate check costs. */
const countDocumentScans = (run: () => void) => {
  const original = ProseMirrorNode.prototype.descendants;
  let scans = 0;

  ProseMirrorNode.prototype.descendants = function patched(...args: unknown[]) {
    scans++;
    // @ts-expect-error the patched method keeps the original signature
    return original.apply(this, args);
  };

  try {
    run();
  } finally {
    ProseMirrorNode.prototype.descendants = original;
  }

  return scans;
};

const paragraphIds = () => {
  const ids: unknown[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "paragraph") ids.push(node.attrs.id);
  });
  return ids;
};

afterEach(() => {
  editor?.destroy();
});

describe("UniqueID plugin", () => {
  it("does not walk the document when typing", () => {
    createEditor("<p>one</p><p>two</p>");

    const scans = countDocumentScans(() => editor.commands.insertContentAt(1, "x"));

    expect(scans).toBe(0);
  });

  it("keeps the id of a node that is edited", () => {
    createEditor('<p data-id="keep">one</p>');

    editor.commands.insertContentAt(2, "x");

    expect(paragraphIds()).toEqual(["keep"]);
  });

  it("gives a duplicated node a fresh id", () => {
    createEditor('<p data-id="dup">one</p>');

    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: "paragraph",
      attrs: { id: "dup" },
      content: [{ type: "text", text: "two" }],
    });

    const ids = paragraphIds();

    expect(ids).toHaveLength(2);
    expect(ids.filter((id) => id === "dup")).toHaveLength(1);
    expect(ids[1]).not.toBe("dup");
  });

  it("walks the document when a duplicate has to be detected", () => {
    createEditor('<p data-id="dup">one</p>');

    const scans = countDocumentScans(() =>
      editor.commands.insertContentAt(editor.state.doc.content.size, {
        type: "paragraph",
        attrs: { id: "dup" },
        content: [{ type: "text", text: "two" }],
      })
    );

    expect(scans).toBeGreaterThan(0);
  });

  it("gives a node without an id a fresh id", async () => {
    createEditor("<p>one</p>");

    // `onCreate` runs in a macrotask, so the ids of the initial content are assigned after the
    // editor was constructed.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(paragraphIds()).toEqual(["generated-0"]);

    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: "paragraph",
      content: [{ type: "text", text: "two" }],
    });

    expect(paragraphIds()).toEqual(["generated-0", "generated-1"]);
  });
});
