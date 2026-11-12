/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 *
 * React cost of the editor's hot consumers.
 *
 * The formatting toolbar and the document info panel both subscribe to an editor event and copy the
 * result into React state. The editor-side part of that work is measurable without React, but the
 * re-render it triggers is not - and that is the part that actually reaches the screen.
 *
 * This module mounts a proxy tree that mirrors those two consumers and measures:
 *   - how often React is asked to re-render,
 *   - how long the render plus commit takes,
 *   - how long the editor-side state computation takes.
 *
 * The proxy is not the real application: it reproduces the subscription pattern, the state shape and
 * the number of rendered children, but not the real component tree. The numbers are therefore an
 * indication of the order of magnitude, not a measurement of the pages editor itself.
 *
 * Both arms run the shipped code where the shipped code exists. The "before" arm rebuilds the menu
 * array for every item the way the editor did before the menu was cached, and the "after" arm uses
 * the cached array and keeps the previous state when nothing changed.
 */

/* oxlint-disable no-await-in-loop -- the benchmark paces itself with real frames */

import type { Editor } from "@tiptap/core";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// editor internals
import {
  BackgroundColorItem,
  BoldItem,
  BulletListItem,
  CodeItem,
  getEditorMenuItems,
  HeadingOneItem,
  HeadingTwoItem,
  HeadingThreeItem,
  HeadingFourItem,
  HeadingFiveItem,
  HeadingSixItem,
  HorizontalRuleItem,
  ImageItem,
  ItalicItem,
  LinkItem,
  NumberedListItem,
  QuoteItem,
  StrikeThroughItem,
  TableItem,
  TextAlignItem,
  TextColorItem,
  TextItem,
  TodoListItem,
  UnderLineItem,
} from "@/components/menus";
import { TOOLBAR_ITEMS } from "@/constants/common";
import { getParagraphCount } from "@/helpers/common";
import { getEditorRefHelpers } from "@/helpers/editor-ref";
import type { EditorMenuItem } from "@/components/menus";
import type { TEditorCommands } from "@/types";

const toolbarItems = Object.values(TOOLBAR_ITEMS.document).flat();

export type ReactCostStats = {
  toolbarComputeMs: number[];
  toolbarRenderMs: number[];
  toolbarRenders: number;
  toolbarSetStates: number;
  infoComputeMs: number[];
  infoRenderMs: number[];
  infoRenders: number;
  infoSetStates: number;
  infoReports: number;
};

type DocumentInfo = { words: number; characters: number; paragraphs: number };

/**
 * The menu array as the editor built it before it was cached: every toolbar item got its own menu.
 */
const buildUncachedMenuItems = (editor: Editor): EditorMenuItem<TEditorCommands>[] =>
  [
    TextItem(editor),
    HeadingOneItem(editor),
    HeadingTwoItem(editor),
    HeadingThreeItem(editor),
    HeadingFourItem(editor),
    HeadingFiveItem(editor),
    HeadingSixItem(editor),
    BoldItem(editor),
    ItalicItem(editor),
    UnderLineItem(editor),
    StrikeThroughItem(editor),
    BulletListItem(editor),
    TodoListItem(editor),
    CodeItem(editor),
    NumberedListItem(editor),
    QuoteItem(editor),
    TableItem(editor),
    ImageItem(editor),
    HorizontalRuleItem(editor),
    LinkItem(editor),
    TextColorItem(editor),
    BackgroundColorItem(editor),
    TextAlignItem(editor),
  ] as EditorMenuItem<TEditorCommands>[];

type TMenuItemProps = Parameters<ReturnType<typeof getEditorMenuItems>[number]["isActive"]>[0];

/**
 * The toolbar items carry their own extra props, and the menu items expect the props of the
 * command they belong to. The toolbar in the application casts the same way.
 */
const buildMenuItemProps = (toolbarItem: (typeof toolbarItems)[number]) =>
  ({ itemKey: toolbarItem.itemKey, ...toolbarItem.extraProps }) as unknown as TMenuItemProps;

/**
 * The toolbar's state computation before the menu was cached: for every toolbar item the menu array
 * was rebuilt and searched again, so the menu was built once per item.
 */
const computeActiveStatesUncached = (editor: Editor) => {
  const states: Record<string, boolean> = {};

  toolbarItems.forEach((toolbarItem) => {
    const editorItems = buildUncachedMenuItems(editor);
    const menuItem = editorItems.find((item) => item.key === toolbarItem.itemKey);

    states[toolbarItem.renderKey] = menuItem ? menuItem.isActive(buildMenuItemProps(toolbarItem)) : false;
  });

  return states;
};

/**
 * The same computation with the cached menu array.
 */
const computeActiveStatesCached = (editor: Editor) => {
  const states: Record<string, boolean> = {};
  const editorItems = getEditorMenuItems(editor);

  toolbarItems.forEach((toolbarItem) => {
    const menuItem = editorItems.find((item) => item.key === toolbarItem.itemKey);

    states[toolbarItem.renderKey] = menuItem ? menuItem.isActive(buildMenuItemProps(toolbarItem)) : false;
  });

  return states;
};

const shallowEqualStates = (a: Record<string, boolean>, b: Record<string, boolean>) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => a[key] === b[key]);
};

const ToolbarItemProxy = memo(function ToolbarItemProxy(props: { label: string; active: boolean }) {
  return <span data-active={props.active}>{props.label}</span>;
});

type ProxyProps = {
  editor: Editor;
  arm: "before" | "after";
  stats: ReactCostStats;
};

function ToolbarProxy(props: ProxyProps) {
  const { editor, arm, stats } = props;
  const [states, setStates] = useState<Record<string, boolean>>({});
  const statesRef = useRef(states);
  const renderStart = useRef(0);
  const renderIndex = useRef(0);

  renderIndex.current += 1;
  const currentIndex = renderIndex.current;
  renderStart.current = performance.now();

  useEffect(() => {
    const handler = () => {
      const started = performance.now();
      const next = arm === "before" ? computeActiveStatesUncached(editor) : computeActiveStatesCached(editor);
      stats.toolbarComputeMs.push(performance.now() - started);

      if (arm === "after" && shallowEqualStates(next, statesRef.current)) return;

      statesRef.current = next;
      stats.toolbarSetStates += 1;
      setStates(next);
    };

    editor.on("transaction", handler);
    handler();

    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, arm]);

  useLayoutEffect(() => {
    if (currentIndex <= 1) return;
    stats.toolbarRenders += 1;
    stats.toolbarRenderMs.push(performance.now() - renderStart.current);
  });

  return (
    <div>
      {toolbarItems.map((toolbarItem) => (
        <ToolbarItemProxy
          key={toolbarItem.renderKey}
          label={toolbarItem.renderKey}
          active={!!states[toolbarItem.renderKey]}
        />
      ))}
    </div>
  );
}

function InfoProxy(props: ProxyProps) {
  const { editor, arm, stats } = props;
  const [info, setInfo] = useState<DocumentInfo>({ words: 0, characters: 0, paragraphs: 0 });
  const infoRef = useRef(info);
  const renderStart = useRef(0);
  const renderIndex = useRef(0);

  renderIndex.current += 1;
  const currentIndex = renderIndex.current;
  renderStart.current = performance.now();

  useEffect(() => {
    const apply = (next: DocumentInfo) => {
      stats.infoReports += 1;

      if (
        arm === "after" &&
        next.words === infoRef.current.words &&
        next.characters === infoRef.current.characters &&
        next.paragraphs === infoRef.current.paragraphs
      ) {
        return;
      }

      infoRef.current = next;
      stats.infoSetStates += 1;
      setInfo(next);
    };

    if (arm === "after") {
      // The shipped implementation: it throttles the report, because reading the counts walks the
      // whole document three times.
      const helpers = getEditorRefHelpers({
        editor,
        getEditorMetaData: (() => ({})) as never,
        provider: undefined,
      });

      const unsubscribe = helpers.onDocumentInfoChange((next) => {
        apply(next);
      });

      return () => {
        unsubscribe();
      };
    }

    const handler = () => {
      const started = performance.now();
      const next: DocumentInfo = {
        characters: editor.storage.characterCount?.characters?.() ?? 0,
        paragraphs: getParagraphCount(editor.state),
        words: editor.storage.characterCount?.words?.() ?? 0,
      };
      stats.infoComputeMs.push(performance.now() - started);
      apply(next);
    };

    editor.on("update", handler);

    return () => {
      editor.off("update", handler);
    };
  }, [editor, arm]);

  useLayoutEffect(() => {
    if (currentIndex <= 1) return;
    stats.infoRenders += 1;
    stats.infoRenderMs.push(performance.now() - renderStart.current);
  });

  return (
    <div>
      <span>{info.words}</span>
      <span>{info.characters}</span>
      <span>{info.paragraphs}</span>
    </div>
  );
}

function Probe(props: ProxyProps) {
  return (
    <div>
      <ToolbarProxy {...props} />
      <InfoProxy {...props} />
    </div>
  );
}

const FRAME_TIMEOUT_MS = 32;

/**
 * Waits for the next animation frame, but does not depend on it. A browser window that is not in
 * the foreground has its animation frames throttled to roughly one per second, which would stretch
 * the measurement to minutes. The timer is the floor, the frame is the ceiling.
 */
const nextPacedFrame = () =>
  Promise.race([
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, FRAME_TIMEOUT_MS)),
  ]);

/**
 * Lets React flush. React schedules updates outside of its own events through the scheduler, which
 * uses a macrotask, so a frame boundary alone is not guaranteed to be late enough.
 */
const flushReact = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await nextPacedFrame();
};

const summarize = (values: number[]) => {
  if (!values.length) return { count: 0, mean: 0, p50: 0, p95: 0, max: 0 };

  const sorted = values.toSorted((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const round = (value: number) => Math.round(value * 1000) / 1000;

  return {
    count: values.length,
    mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    p50: round(at(0.5)),
    p95: round(at(0.95)),
    max: round(sorted[sorted.length - 1]),
  };
};

/**
 * Mounts the proxy tree, drives the editor and reports what React did.
 */
export const measureReactCost = async (options: {
  editor: Editor;
  arm: "before" | "after";
  keystrokes: number;
  moves: number;
}) => {
  const { editor, arm, keystrokes, moves } = options;

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:800px;";
  document.body.appendChild(container);

  const root = createRoot(container);
  const stats: ReactCostStats = {
    toolbarComputeMs: [],
    toolbarRenderMs: [],
    toolbarRenders: 0,
    toolbarSetStates: 0,
    infoComputeMs: [],
    infoRenderMs: [],
    infoRenders: 0,
    infoSetStates: 0,
    infoReports: 0,
  };

  root.render(<Probe editor={editor} arm={arm} stats={stats} />);
  await flushReact();

  const typeTimes: number[] = [];
  const moveTimes: number[] = [];

  for (let i = 0; i < keystrokes; i++) {
    await nextPacedFrame();
    const started = performance.now();
    editor.commands.insertContentAt(1, "x");
    typeTimes.push(performance.now() - started);
    await flushReact();
  }

  const position = editor.state.doc.content.size - 2;

  for (let i = 0; i < moves; i++) {
    await nextPacedFrame();
    const started = performance.now();
    editor.commands.setTextSelection(position);
    moveTimes.push(performance.now() - started);
    await flushReact();
  }

  root.unmount();
  container.remove();

  return {
    arm,
    keystrokes,
    moves,
    typeMs: summarize(typeTimes),
    moveMs: summarize(moveTimes),
    toolbarComputeMs: summarize(stats.toolbarComputeMs),
    toolbarRenderMs: summarize(stats.toolbarRenderMs),
    toolbarRenders: stats.toolbarRenders,
    toolbarSetStates: stats.toolbarSetStates,
    infoComputeMs: summarize(stats.infoComputeMs),
    infoRenderMs: summarize(stats.infoRenderMs),
    infoRenders: stats.infoRenders,
    infoSetStates: stats.infoSetStates,
    infoReports: stats.infoReports,
  };
};
