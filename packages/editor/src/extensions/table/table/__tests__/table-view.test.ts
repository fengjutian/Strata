/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
// extensions
import { Table } from "@/extensions/table/table";
import { TableCell } from "@/extensions/table/table-cell";
import { TableHeader } from "@/extensions/table/table-header";
import { TableRow } from "@/extensions/table/table-row";
import { getColumnWidthKey } from "@/extensions/table/table/table-view";

const CONTENT =
  "<table><tbody>" +
  "<tr><th><p>Head</p></th><th><p>Head</p></th></tr>" +
  "<tr><td><p>Cell</p></td><td><p>Cell</p></td></tr>" +
  "</tbody></table>";

let editor: Editor;

const createEditor = (content: string) => {
  editor = new Editor({
    element: document.createElement("div"),
    content,
    extensions: [StarterKit, Table, TableRow, TableCell, TableHeader],
  });
  return editor;
};

const tableElement = () => editor.view.dom.querySelector("table") as HTMLTableElement;

/**
 * Counts the writes to the width of the table. Writing the width of a table invalidates its
 * layout, so a write on every keystroke makes the browser lay the whole table out again.
 */
const countWidthWrites = (table: HTMLTableElement) => {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(table.style), "width");
  let writes = 0;

  Object.defineProperty(table.style, "width", {
    configurable: true,
    get(): string {
      return (descriptor?.get?.call(table.style) as string) ?? "";
    },
    set(value: string) {
      writes += 1;
      descriptor?.set?.call(table.style, value);
    },
  });

  return () => writes;
};

/** The position of the first cell of the table. */
const firstCellPosition = () => {
  let position = -1;

  editor.state.doc.descendants((node, pos) => {
    if (position !== -1) return false;
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      position = pos;
      return false;
    }
    return undefined;
  });

  return position;
};

afterEach(() => {
  editor?.destroy();
});

describe("TableView column widths", () => {
  it("keeps the column width key when a cell is edited", () => {
    createEditor(CONTENT);

    const before = getColumnWidthKey(editor.state.doc);

    editor.commands.setTextSelection(4);
    editor.commands.insertContent("x");

    expect(getColumnWidthKey(editor.state.doc)).toBe(before);
  });

  it("changes the column width key when a column width changes", () => {
    createEditor(CONTENT);

    const before = getColumnWidthKey(editor.state.doc);
    const position = firstCellPosition();
    const cell = editor.state.doc.nodeAt(position);

    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(position, undefined, { ...cell?.attrs, colwidth: [300] })
    );

    expect(getColumnWidthKey(editor.state.doc)).not.toBe(before);
  });

  it("does not rewrite the width of the table when a cell is edited", () => {
    createEditor(CONTENT);

    const writes = countWidthWrites(tableElement());

    editor.commands.setTextSelection(4);
    editor.commands.insertContent("x");

    expect(writes()).toBe(0);
  });

  it("rewrites the width of the table when a column width changes", () => {
    createEditor(CONTENT);

    const writes = countWidthWrites(tableElement());
    const position = firstCellPosition();
    const cell = editor.state.doc.nodeAt(position);

    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(position, undefined, { ...cell?.attrs, colwidth: [300] })
    );

    expect(writes()).toBeGreaterThan(0);
  });
});
