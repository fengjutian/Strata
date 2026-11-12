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
 */

/* oxlint-disable no-await-in-loop -- the benchmark paces itself with real frames */

import type { Editor } from "@tiptap/core";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// editor internals
import { getEditorMenuItems } from "@/components/menus";
import { TOOLBAR_ITEMS } from "@/constants/common";
import { getParagraphCount } from "@/helpers/common";

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
};

/**
 * The toolbar's current implementation: for every toolbar item the menu array is rebuilt and
 * searched again, so the menu is built once per item.
 */
const computeActiveStates = (editor: Editor) => {
  const states: Record<string, boolean> = {};

  toolbarItems.forEach((toolbarItem) => {
    const editorItems = getEditorMenuItems(editor);
    const menuItem = editorItems.find((item) => item.key === toolbarItem.itemKey);

    states[toolbarItem.renderKey] = menuItem
      ? menuItem.isActive({ itemKey: toolbarItem.itemKey, ...toolbarItem.extraProps })
      : false;
  });

  return states;
};

/**
 * The same computation with the menu array built once per recomputation instead of once per item.
 */
const computeActiveStatesCached = (editor: Editor) => {
  const states: Record<string, boolean> = {};
  const editorItems = getEditorMenuItems(editor);

  toolbarItems.forEach((toolbarItem) => {
    const menuItem = editorItems.find((item) => item.key === toolbarItem.itemKey);

    states[toolbarItem.renderKey] = menuItem
      ? menuItem.isActive({ itemKey: toolbarItem.itemKey, ...toolbarItem.extraProps })
      : false;
  });

  return states;
};

const shallowEqualStates = (a: Record<string, boolean>, b: Record<string, boolean>) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => a[key] === b[key]);
};

type DocumentInfo = { words: number; characters: number; paragraphs: number };

const computeDocumentInfo = (editor: Editor): DocumentInfo => ({
  characters: editor.storage.characterCount?.characters?.() ?? 0,
  paragraphs: getParagraphCount(editor.state),
  words: editor.storage.characterCount?.words?.() ?? 0,
});

const ToolbarItemProxy = memo(function ToolbarItemProxy(props: { label: string; active: boolean }) {
  return <span data-active={props.active}>{props.label}</span>;
});

type ProxyProps = {
  editor: Editor;
  optimize: boolean;
  stats: ReactCostStats;
};

function ToolbarProxy(props: ProxyProps) {
  const { editor, optimize, stats } = props;
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
      const next = optimize ? computeActiveStatesCached(editor) : computeActiveStates(editor);
      stats.toolbarComputeMs.push(performance.now() - started);

      if (optimize && shallowEqualStates(next, statesRef.current)) return;

      statesRef.current = next;
      stats.toolbarSetStates += 1;
      setStates(next);
    };

    editor.on("transaction", handler);
    handler();

    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, optimize]);

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
  const { editor, optimize, stats } = props;
  const [info, setInfo] = useState<DocumentInfo>({ words: 0, characters: 0, paragraphs: 0 });
  const infoRef = useRef(info);
  const renderStart = useRef(0);
  const renderIndex = useRef(0);

  renderIndex.current += 1;
  const currentIndex = renderIndex.current;
  renderStart.current = performance.now();

  useEffect(() => {
    const handler = () => {
      const started = performance.now();
      const next = computeDocumentInfo(editor);
      stats.infoComputeMs.push(performance.now() - started);

      if (
        optimize &&
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

    editor.on("update", handler);
    handler();

    return () => {
      editor.off("update", handler);
    };
  }, [editor, optimize]);

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
  new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    requestAnimationFrame(finish);
    setTimeout(finish, FRAME_TIMEOUT_MS);
  });

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
  optimize: boolean;
  keystrokes: number;
  moves: number;
}) => {
  const { editor, optimize, keystrokes, moves } = options;

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
  };

  root.render(<Probe editor={editor} optimize={optimize} stats={stats} />);
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
    optimize,
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
  };
};
