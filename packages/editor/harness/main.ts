/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 *
 * Browser bench for the Strata editor.
 *
 * Headless DOM (happy-dom) cannot express layout, so the numbers that matter for the editor's hot
 * paths - forced layout, frame budget, paint cost - have to be taken in a real browser. This harness
 * boots the real extension set against the real stylesheet, runs the measurement on load and writes
 * the result into the DOM so it can be read without any script injection.
 *
 * Two rules keep the numbers honest:
 *
 * 1. Every measurement is an A/B inside the same page. The same document and the same event stream
 *    are run through the current implementation and through the implementation it replaced, so the
 *    difference is the only variable.
 * 2. Every measurement asserts that it actually did the work. A hit test that misses the viewport
 *    returns an empty list and silently turns the measurement into a no-op, so the hit count is
 *    reported next to the timing.
 */

/* oxlint-disable no-await-in-loop -- the benchmark paces itself with real animation frames */
/* oxlint-disable import/no-unassigned-import -- the stylesheet is imported for its side effect */

import { Editor, Extension } from "@tiptap/core";
import { common, createLowlight } from "lowlight";
import ts from "highlight.js/lib/languages/typescript";
// editor internals
import { CoreEditorExtensions, SideMenuExtension } from "@/extensions";
import { LOWLIGHT_PLUGIN_MARKER, LowlightPlugin } from "@/extensions/code/lowlight-plugin";
import { getParagraphCount } from "@/helpers/common";
import { nodeDOMAtCoords } from "@/plugins/drag-handle";
import { measureReactCost } from "./react-cost";
import "./styles.css";

const HOST_ID = "editor-host";
const RESULT_ID = "bench-results";
const LIVE_ID = "live-counters";

/** The drag handle sits this far to the left of the block it points at. */
const HANDLE_OFFSET = 50 + 24;

const buildContent = (paragraphs: number) => {
  let html = "";
  for (let i = 0; i < paragraphs; i++) {
    html += `<p class="editor-paragraph-block">Paragraph ${i} with some text content that wraps on narrow columns</p>`;
  }
  html +=
    "<table><tbody><tr><th><p>Head</p></th><th><p>Head</p></th></tr>" +
    "<tr><td><p>Cell</p></td><td><p>Cell</p></td></tr></tbody></table>";
  return html;
};

const lowlight = createLowlight(common);
lowlight.register("ts", ts);

/**
 * Reproduces the state that existed before the duplicate lowlight plugin was removed: the same
 * plugin registered a second time, so every transaction scans the whole document twice as often.
 */
const DuplicateLowlightExtension = Extension.create({
  name: "duplicateLowlight",
  addProseMirrorPlugins() {
    return [
      LowlightPlugin({
        name: "codeBlock",
        lowlight,
        defaultLanguage: null,
      }),
    ];
  },
});

const createEditor = (paragraphs: number, extraExtensions: Extension[] = []) =>
  new Editor({
    element: document.getElementById(HOST_ID) as HTMLElement,
    content: buildContent(paragraphs),
    extensions: [
      ...CoreEditorExtensions({
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
      SideMenuExtension({ aiEnabled: true, dragDropEnabled: true }),
      ...extraExtensions,
    ],
  });

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

const round = (value: number) => Math.round(value * 1000) / 1000;

const sourceOf = (fn: (...args: never[]) => unknown) =>
  Function.prototype.toString.call(fn).replace(/\s+/g, " ").slice(0, 130);

const summarize = (values: number[]) => ({
  count: values.length,
  mean: round(values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0),
  p50: round(percentile(values, 0.5)),
  p95: round(percentile(values, 0.95)),
  max: round(values.length ? Math.max(...values) : 0),
});

/* -------------------------------------------------------------------------- */
/* Live counters                                                               */
/* -------------------------------------------------------------------------- */

const counters = {
  mousemoveEvents: 0,
  frames: 0,
  hitTests: 0,
  currentHitTests: 0,
};

let phase: "idle" | "current" = "idle";

const originalElementsFromPoint = document.elementsFromPoint.bind(document);
(document as unknown as { elementsFromPoint: unknown }).elementsFromPoint = (x: number, y: number) => {
  counters.hitTests++;
  if (phase === "current") counters.currentHitTests++;
  return originalElementsFromPoint(x, y);
};

document.addEventListener(
  "mousemove",
  () => {
    counters.mousemoveEvents++;
  },
  true
);

const liveTarget = document.createElement("pre");
liveTarget.id = LIVE_ID;
liveTarget.style.cssText = "white-space: pre-wrap; font: 12px/1.5 monospace; padding: 16px;";
document.body.appendChild(liveTarget);

const renderLive = () => {
  liveTarget.textContent = JSON.stringify(counters, null, 2);
};

let liveFrames = 0;
const liveTick = () => {
  counters.frames++;
  liveFrames++;
  if (liveFrames % 10 === 0) renderLive();
  requestAnimationFrame(liveTick);
};
requestAnimationFrame(liveTick);

/* -------------------------------------------------------------------------- */
/* Targets                                                                     */
/* -------------------------------------------------------------------------- */

type Target = { clientX: number; clientY: number; hitX: number; hitY: number };

/**
 * Picks a block that is actually inside the viewport. `elementsFromPoint` returns nothing for
 * coordinates outside the viewport, so a target that is merely inside the document would turn every
 * measurement into a no-op.
 */
const pickTarget = (editor: Editor): Target | null => {
  const blocks = Array.from(editor.view.dom.querySelectorAll("p, h1, h2, h3")) as HTMLElement[];

  for (const block of blocks) {
    const rect = block.getBoundingClientRect();
    if (rect.top < 30 || rect.bottom > window.innerHeight - 20) continue;
    if (rect.width < 60 || rect.height < 8) continue;

    const hitX = rect.left + Math.min(120, rect.width / 2);
    const hitY = rect.top + rect.height / 2;

    return { clientX: hitX - HANDLE_OFFSET, clientY: hitY, hitX, hitY };
  }

  return null;
};

const sideMenuElement = () => {
  const all = Array.from(document.querySelectorAll("#editor-side-menu")) as HTMLElement[];
  return all.length ? all[all.length - 1] : null;
};

/* -------------------------------------------------------------------------- */
/* The side menu work                                                          */
/* -------------------------------------------------------------------------- */

type WorkResult = { hit: boolean; readMs: number; writeMs: number };

/**
 * The read/write sequence the side menu performs for one pointer position: hit test, read the
 * computed style, read the box, then write the new position. The write invalidates layout, so the
 * next read has to lay the document out again.
 */
const runSideMenuWork = (clientX: number, clientY: number): WorkResult => {
  const readStart = performance.now();

  const node = nodeDOMAtCoords({ x: clientX + HANDLE_OFFSET, y: clientY });
  if (!(node instanceof Element) || node.matches("ul, ol")) {
    return { hit: false, readMs: performance.now() - readStart, writeMs: 0 };
  }

  const compStyle = window.getComputedStyle(node);
  const lineHeight = parseInt(compStyle.lineHeight, 10);
  const paddingTop = parseInt(compStyle.paddingTop, 10);
  const rect = node.getBoundingClientRect();

  const readMs = performance.now() - readStart;

  const writeStart = performance.now();
  const menu = sideMenuElement();
  if (menu) {
    menu.style.left = `${rect.left - 24}px`;
    menu.style.top = `${rect.top + (lineHeight - 20) / 2 + paddingTop}px`;
  }
  const writeMs = performance.now() - writeStart;

  return { hit: true, readMs, writeMs };
};

/**
 * Runs `bursts` bursts of `perBurst` pointer positions. With `perFrame` the positions of a burst are
 * collapsed into one update per painted frame, which is what the rAF coalescing does. Without it,
 * every position is handled immediately, which is what the editor used to do.
 */
const runBursts = async (target: Target, bursts: number, perBurst: number, perFrame: boolean) => {
  const readTimes: number[] = [];
  const writeTimes: number[] = [];
  let hits = 0;

  const started = performance.now();

  for (let burst = 0; burst < bursts; burst++) {
    for (let event = 0; event < perBurst; event++) {
      const result = runSideMenuWork(target.clientX + (event % 3), target.clientY + (event % 2));
      readTimes.push(result.readMs);
      writeTimes.push(result.writeMs);
      if (result.hit) hits++;
    }
    if (perFrame) await nextFrame();
  }

  const totalMs = performance.now() - started;

  return {
    bursts,
    perBurst,
    events: bursts * perBurst,
    hits,
    totalMs: round(totalMs),
    perEventMs: round(totalMs / (bursts * perBurst)),
    readMs: summarize(readTimes),
    writeMs: summarize(writeTimes),
  };
};

/**
 * Verifies that the shipped plugin really coalesces: a burst of pointer events must produce a
 * single document hit test, not one per event.
 */
const measurePluginCoalescing = async (editor: Editor, target: Target, events: number) => {
  phase = "current";
  const before = counters.currentHitTests;

  for (let i = 0; i < events; i++) {
    editor.view.dom.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: target.clientX + (i % 5),
        clientY: target.clientY,
        bubbles: true,
      })
    );
  }

  const duringBurst = counters.currentHitTests - before;

  await nextFrame();
  await nextFrame();

  const afterFrame = counters.currentHitTests - before;
  phase = "idle";

  return { events, hitTestsDuringBurst: duringBurst, hitTestsAfterFrame: afterFrame };
};

/* -------------------------------------------------------------------------- */
/* Transactions                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Splits a transaction into the part that runs the plugin pipeline and the part that updates the
 * DOM. The first is optimizable JavaScript, the second is browser work that no editor change can
 * remove.
 */
const measurePipeline = (editor: Editor, count: number) => {
  const applyTimes: number[] = [];
  const updateTimes: number[] = [];

  for (let i = 0; i < count; i++) {
    const tr = editor.state.tr.insertText("x", 1);

    const applyStart = performance.now();
    const next = editor.state.apply(tr);
    const applyEnd = performance.now();

    editor.view.updateState(next);
    const updateEnd = performance.now();

    applyTimes.push(applyEnd - applyStart);
    updateTimes.push(updateEnd - applyEnd);
  }

  return { applyMs: summarize(applyTimes), updateStateMs: summarize(updateTimes) };
};

/**
 * Attributes transaction time to the plugin that spent it. ProseMirror reads `plugin.spec.state.apply`
 * at call time, so wrapping the spec attributes the cost without changing the behaviour.
 */
const profilePlugins = (editor: Editor, transactions: number) => {
  const plugins = editor.view.state.plugins;
  const totals = new Map<string, { label: string; time: number; calls: number }>();
  const restore: Array<() => void> = [];

  const record = (pluginKey: string, label: string, duration: number) => {
    const id = `${pluginKey} ${label}`;
    const entry = totals.get(id) ?? { label, time: 0, calls: 0 };
    entry.time += duration;
    entry.calls += 1;
    totals.set(id, entry);
  };

  plugins.forEach((plugin) => {
    // ProseMirror does not publish the plugin key on the type, but it is there at runtime.
    const pluginKey = (plugin as unknown as { key: string }).key;
    const spec = plugin.spec as unknown as {
      state?: { apply?: (...args: never[]) => unknown };
      appendTransaction?: (...args: never[]) => unknown;
      props?: { decorations?: (...args: never[]) => unknown };
    };

    const apply = spec.state?.apply;
    if (apply) {
      const label = `apply ${sourceOf(apply)}`;
      spec.state!.apply = function (...args: never[]) {
        const started = performance.now();
        try {
          return apply.apply(this, args);
        } finally {
          record(pluginKey, label, performance.now() - started);
        }
      };
      restore.push(() => {
        spec.state!.apply = apply;
      });
    }

    const appendTransaction = spec.appendTransaction;
    if (appendTransaction) {
      const label = `appendTransaction ${sourceOf(appendTransaction)}`;
      spec.appendTransaction = function (...args: never[]) {
        const started = performance.now();
        try {
          return appendTransaction.apply(this, args);
        } finally {
          record(pluginKey, label, performance.now() - started);
        }
      };
      restore.push(() => {
        spec.appendTransaction = appendTransaction;
      });
    }

    const decorations = spec.props?.decorations;
    if (decorations) {
      const label = `decorations ${sourceOf(decorations)}`;
      spec.props!.decorations = function (...args: never[]) {
        const started = performance.now();
        try {
          return decorations.apply(this, args);
        } finally {
          record(pluginKey, label, performance.now() - started);
        }
      };
      restore.push(() => {
        spec.props!.decorations = decorations;
      });
    }
  });

  for (let i = 0; i < transactions; i++) {
    editor.commands.insertContentAt(1, "x");
  }

  restore.forEach((undo) => undo());

  return [...totals.entries()]
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      totalMs: round(entry.time),
      calls: entry.calls,
      perCallMs: round(entry.time / entry.calls),
    }))
    .toSorted((a, b) => b.totalMs - a.totalMs)
    .slice(0, 12);
};

/**
 * The document info panel of the pages editor subscribes to the real `update` event, so it runs on
 * every keystroke. That path lives outside the ProseMirror transaction, which means the plugin
 * profiler cannot see it - and the character count is computed lazily, on every call.
 */
const measureDocumentInfo = async (paragraphs: number) => {
  const editor = createEditor(paragraphs);
  await nextFrame();

  const totalTimes: number[] = [];
  const characterTimes: number[] = [];
  const wordTimes: number[] = [];
  const paragraphTimes: number[] = [];

  const handleUpdate = () => {
    const start = performance.now();
    void editor.storage.characterCount?.characters?.();
    const afterCharacters = performance.now();
    void editor.storage.characterCount?.words?.();
    const afterWords = performance.now();
    getParagraphCount(editor.state);
    const end = performance.now();

    characterTimes.push(afterCharacters - start);
    wordTimes.push(afterWords - afterCharacters);
    paragraphTimes.push(end - afterWords);
    totalTimes.push(end - start);
  };

  editor.on("update", handleUpdate);

  for (let i = 0; i < 30; i++) {
    await nextFrame();
    editor.commands.insertContentAt(1, "x");
  }

  editor.off("update", handleUpdate);
  editor.destroy();

  return {
    paragraphs,
    totalMs: summarize(totalTimes),
    charactersMs: summarize(characterTimes),
    wordsMs: summarize(wordTimes),
    paragraphCountMs: summarize(paragraphTimes),
  };
};

/**
 * The description editor hands the whole document to its consumer on every keystroke, as JSON and
 * as HTML. Both serializations walk the whole document, so their cost grows with its size.
 */
const measureSerialization = async (paragraphs: number) => {
  const editor = createEditor(paragraphs);
  await nextFrame();

  const jsonTimes: number[] = [];
  const htmlTimes: number[] = [];
  const totalTimes: number[] = [];

  for (let i = 0; i < 30; i++) {
    await nextFrame();

    const start = performance.now();
    editor.getJSON();
    const afterJson = performance.now();
    editor.getHTML();
    const afterHtml = performance.now();

    jsonTimes.push(afterJson - start);
    htmlTimes.push(afterHtml - afterJson);
    totalTimes.push(afterHtml - start);
  }

  editor.destroy();

  return {
    paragraphs,
    totalMs: summarize(totalTimes),
    jsonMs: summarize(jsonTimes),
    htmlMs: summarize(htmlTimes),
  };
};

/**
 * The cost of a keystroke with and without a consumer that serializes the document on every update.
 * This is the difference the lazy getters make: the consumer that only needs the content when it
 * saves no longer pays for the serialization on every keystroke.
 */
const measureUpdatePath = async (paragraphs: number, serialize: boolean) => {
  const editor = createEditor(paragraphs);
  await nextFrame();

  const times: number[] = [];

  editor.on("update", () => {
    if (!serialize) return;

    editor.getJSON();
    editor.getHTML();
  });

  for (let i = 0; i < 30; i++) {
    await nextFrame();
    const started = performance.now();
    editor.commands.insertContentAt(1, "x");
    times.push(performance.now() - started);
  }

  editor.destroy();

  return { paragraphs, serialize, keystrokeMs: summarize(times) };
};

const measureTransactions = async (editor: Editor, count: number) => {
  const typeTimes: number[] = [];
  const selectionTimes: number[] = [];

  for (let i = 0; i < count; i++) {
    await nextFrame();
    const typeStart = performance.now();
    editor.commands.insertContentAt(1, "x");
    typeTimes.push(performance.now() - typeStart);
  }

  const position = editor.state.doc.content.size - 2;

  for (let i = 0; i < count; i++) {
    await nextFrame();
    const selectionStart = performance.now();
    editor.commands.setTextSelection(position);
    selectionTimes.push(performance.now() - selectionStart);
  }

  return {
    typeMs: summarize(typeTimes),
    selectionMs: summarize(selectionTimes),
    plugins: editor.view.state.plugins.length,
    lowlightPlugins: editor.view.state.plugins.filter(
      (plugin) => (plugin.spec as unknown as Record<string, unknown>)[LOWLIGHT_PLUGIN_MARKER]
    ).length,
  };
};

/* -------------------------------------------------------------------------- */
/* Runs                                                                         */
/* -------------------------------------------------------------------------- */

const scrollToTop = async () => {
  window.scrollTo(0, 0);
  await nextFrame();
  await nextFrame();
};

const runLowlightAB = async (paragraphs: number) => {
  const single = createEditor(paragraphs);
  await nextFrame();
  const singleResult = await measureTransactions(single, 30);
  const singlePipeline = measurePipeline(single, 60);
  single.destroy();

  const duplicated = createEditor(paragraphs, [DuplicateLowlightExtension]);
  await nextFrame();
  const duplicatedResult = await measureTransactions(duplicated, 30);
  const duplicatedPipeline = measurePipeline(duplicated, 60);
  duplicated.destroy();

  return {
    paragraphs,
    single: { ...singleResult, pipeline: singlePipeline },
    duplicated: { ...duplicatedResult, pipeline: duplicatedPipeline },
  };
};

const runSideMenuAB = async (paragraphs: number) => {
  const editor = createEditor(paragraphs);
  await scrollToTop();

  const target = pickTarget(editor);

  if (!target) {
    editor.destroy();
    return { paragraphs, error: "no visible target" };
  }

  const coalescing = await measurePluginCoalescing(editor, target, 30);

  const perEvent = await runBursts(target, 30, 10, false);
  const perFrame = await runBursts(target, 30, 10, true);

  editor.destroy();

  return { paragraphs, coalescing, perEvent, perFrame };
};

const runDiagnostics = () => ({
  sideMenuElements: document.querySelectorAll("#editor-side-menu").length,
  userAgent: navigator.userAgent,
  viewport: { width: window.innerWidth, height: window.innerHeight },
});

const write = (payload: Record<string, unknown>) => {
  const style = "white-space: pre-wrap; font: 12px/1.5 monospace; padding: 16px;";

  const full = document.createElement("pre");
  full.id = RESULT_ID;
  full.style.cssText = style;
  full.textContent = JSON.stringify(payload, null, 2);
  document.body.appendChild(full);

  // Every section also gets its own node, so a single section can be read without pulling in the
  // whole report.
  Object.entries(payload).forEach(([key, value]) => {
    const section = document.createElement("pre");
    section.id = `bench-${key}`;
    section.style.cssText = style;
    section.textContent = JSON.stringify(value, null, 2);
    document.body.appendChild(section);
  });
};

const main = async () => {
  const lowlightAB = [];
  for (const paragraphs of [50, 200, 1000]) {
    lowlightAB.push(await runLowlightAB(paragraphs));
  }

  const sideMenuAB = [];
  for (const paragraphs of [50, 1000]) {
    sideMenuAB.push(await runSideMenuAB(paragraphs));
  }

  const updatePath = [];
  for (const paragraphs of [50, 200, 1000]) {
    updatePath.push({
      paragraphs,
      eager: await measureUpdatePath(paragraphs, true),
      lazy: await measureUpdatePath(paragraphs, false),
    });
  }

  const serialization = [];
  for (const paragraphs of [50, 200, 1000]) {
    serialization.push(await measureSerialization(paragraphs));
  }

  const documentInfo = [];
  for (const paragraphs of [50, 200, 1000]) {
    documentInfo.push(await measureDocumentInfo(paragraphs));
  }

  const profiles = [];
  for (const paragraphs of [50, 1000]) {
    const editor = createEditor(paragraphs);
    await nextFrame();
    const top = profilePlugins(editor, 50);
    editor.destroy();
    profiles.push({ paragraphs, top });
  }

  const reactCost = [];
  for (const paragraphs of [50]) {
    const currentEditor = createEditor(paragraphs);
    await nextFrame();
    const current = await measureReactCost({
      editor: currentEditor,
      optimize: false,
      keystrokes: 30,
      moves: 30,
    });
    currentEditor.destroy();

    const optimizedEditor = createEditor(paragraphs);
    await nextFrame();
    const optimized = await measureReactCost({
      editor: optimizedEditor,
      optimize: true,
      keystrokes: 30,
      moves: 30,
    });
    optimizedEditor.destroy();

    reactCost.push({ paragraphs, current, optimized });
  }

  // Leave a visible editor behind so the page is not blank and real pointer input can be driven.
  const editor = createEditor(50);
  await scrollToTop();
  void editor;

  renderLive();
  write({
    lowlightAB,
    sideMenuAB,
    updatePath,
    serialization,
    documentInfo,
    profiles,
    reactCost,
    diagnostics: runDiagnostics(),
  });
  (window as unknown as { __benchReady: boolean }).__benchReady = true;
};

void main();
