/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// types
import type { IMarking } from "@/types";

export type HeadingExtensionStorage = {
  headings: IMarking[];
};

declare module "@tiptap/core" {
  interface Storage {
    [CORE_EXTENSIONS.HEADINGS_LIST]: HeadingExtensionStorage;
  }

  /**
   * Emitted whenever the heading list changes. Kept separate from `update` so consumers can react to
   * heading changes without triggering the (expensive) document serialization that `update` implies.
   */
  interface EditorEvents {
    headingsChange: {
      editor: Editor;
      headings: IMarking[];
    };
  }
}

const HEADINGS_LIST_PLUGIN_KEY = new PluginKey<IMarking[]>("heading-list");

/**
 * Reads the current heading list straight from the plugin state. This is the source of truth: the
 * extension storage is only a mirror kept in sync for backwards compatibility.
 */
export const getHeadingsFromState = (editor: Editor | null | undefined): IMarking[] => {
  if (!editor) return [];
  return HEADINGS_LIST_PLUGIN_KEY.getState(editor.state) ?? [];
};

const collectHeadings = (doc: ProseMirrorNode): IMarking[] => {
  const headings: IMarking[] = [];
  let h1Sequence = 0;
  let h2Sequence = 0;
  let h3Sequence = 0;

  doc.descendants((node) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level;
      const text = node.textContent;

      headings.push({
        type: "heading",
        level: level,
        text: text,
        sequence: level === 1 ? ++h1Sequence : level === 2 ? ++h2Sequence : ++h3Sequence,
      });
    }
  });

  return headings;
};

const isSameHeadingList = (a: IMarking[], b: IMarking[]) =>
  a.length === b.length &&
  a.every((heading, index) => {
    const other = b[index];
    return heading.level === other.level && heading.text === other.text && heading.sequence === other.sequence;
  });

export const HeadingListExtension = Extension.create<unknown, HeadingExtensionStorage>({
  name: CORE_EXTENSIONS.HEADINGS_LIST,

  addStorage() {
    return {
      headings: [] as IMarking[],
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const storage = this.storage;

    const plugin = new Plugin<IMarking[]>({
      key: HEADINGS_LIST_PLUGIN_KEY,
      state: {
        init: (_, state) => collectHeadings(state.doc),
        // Only rebuild the heading list when the document actually changed. Selection-only transactions
        // (cursor moves) leave the headings untouched, so they can reuse the previous list as-is.
        apply: (tr, prev, _oldState, newState) => {
          if (!tr.docChanged) return prev;

          const next = collectHeadings(newState.doc);
          if (isSameHeadingList(prev, next)) return prev;

          return next;
        },
      },
      view: (view) => {
        // Seed the storage mirror with the plugin state's initial value. The `update` hook below only runs
        // after the first transaction, so without this the heading list would be empty until then.
        storage.headings = HEADINGS_LIST_PLUGIN_KEY.getState(view.state) ?? [];

        return {
          update: (updatedView, prevState) => {
            const headings = HEADINGS_LIST_PLUGIN_KEY.getState(updatedView.state) ?? [];
            const previous = HEADINGS_LIST_PLUGIN_KEY.getState(prevState) ?? [];

            storage.headings = headings;

            // Only announce an actual heading change. The previous implementation emitted a synthetic
            // `update` event on every transaction, which forced `onUpdate` consumers to serialize the whole
            // document (JSON + HTML) even for pure cursor movements.
            if (!isSameHeadingList(previous, headings)) {
              editor.emit("headingsChange", { editor, headings });
            }
          },
        };
      },
    });

    return [plugin];
  },
});
