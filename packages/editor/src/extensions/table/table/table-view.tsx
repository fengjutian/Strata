/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor, NodeViewProps } from "@tiptap/core";
import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";
import { TableMap, updateColumnsOnResize } from "@tiptap/pm/tables";
import type { Decoration, NodeView } from "@tiptap/pm/view";
import { h } from "jsx-dom-cjs";

/**
 * The column widths that `updateColumnsOnResize` writes are derived from the first row of the
 * table: the colspan and the colwidth of its cells.
 */
export const getColumnWidthKey = (node: ProseMirrorNode) => {
  const row = node.firstChild;
  if (!row) return "";

  let key = "";

  row.forEach((cell) => {
    const { colspan, colwidth } = cell.attrs as { colspan: number; colwidth: number[] | null };
    key += `${colspan}:${colwidth?.join(",") ?? ""};`;
  });

  return key;
};

export class TableView implements NodeView {
  node: ProseMirrorNode;
  cellMinWidth: number;
  decorations: readonly Decoration[];
  editor: Editor;
  getPos: NodeViewProps["getPos"];
  hoveredCell: ResolvedPos | null = null;
  map: TableMap;
  root: HTMLElement;
  table: HTMLTableElement;
  colgroup: HTMLTableColElement;
  tbody: HTMLElement;
  controls?: HTMLElement;
  /**
   * The column widths that were written last. Writing the width of a table invalidates its
   * layout, and the next read has to lay the whole table out again - which is why a keystroke in
   * a table is far more expensive than a keystroke in a paragraph.
   */
  columnWidthKey: string;

  get dom() {
    return this.root;
  }

  get contentDOM() {
    return this.tbody;
  }

  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    decorations: readonly Decoration[],
    editor: Editor,
    getPos: NodeViewProps["getPos"]
  ) {
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.decorations = decorations;
    this.editor = editor;
    this.getPos = getPos;
    this.hoveredCell = null;
    this.map = TableMap.get(node);
    this.columnWidthKey = "";

    this.colgroup = h(
      "colgroup",
      null,
      Array.from({ length: this.map.width }, () => 1).map(() => h("col"))
    );
    this.tbody = h("tbody");
    this.table = h("table", null, this.colgroup, this.tbody);

    this.root = h(
      "div",
      {
        className: "table-wrapper editor-full-width-block horizontal-scrollbar scrollbar-sm",
      },
      this.table
    );

    this.render();
  }

  update(node: ProseMirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.decorations = [...decorations];
    this.map = TableMap.get(this.node);

    this.render();

    return true;
  }

  render() {
    let columnsReplaced = false;

    if (this.colgroup.children.length !== this.map.width) {
      const cols = Array.from({ length: this.map.width }, () => 1).map(() => h("col"));
      this.colgroup.replaceChildren(...cols);
      columnsReplaced = true;
    }

    // The widths only change when the first row changes, and rewriting the width of a table
    // invalidates its layout. Writing it again for every keystroke makes the browser lay the
    // whole table out again before the next read.
    const key = getColumnWidthKey(this.node);
    if (!columnsReplaced && key === this.columnWidthKey) return;

    this.columnWidthKey = key;
    updateColumnsOnResize(this.node, this.colgroup, this.table, this.cellMinWidth);
  }

  ignoreMutation() {
    return true;
  }
}
