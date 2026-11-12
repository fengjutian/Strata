/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIDE_MENU_PLUGIN_KEY, SideMenuExtension } from "../side-menu";

const DRAG_HANDLE_WIDTH = 24;
const X_OFFSET = 50 + DRAG_HANDLE_WIDTH;

let editor: Editor;
let elementsFromPoint: ReturnType<typeof vi.fn>;
let hovered: HTMLElement;

const getPlugin = () => {
  const plugin = SIDE_MENU_PLUGIN_KEY.get(editor.view.state);
  if (!plugin) throw new Error("sideMenu plugin not found");
  return plugin;
};

const mousemove = (clientX: number, clientY: number) => {
  const plugin = getPlugin();
  const handler = plugin.props.handleDOMEvents?.mousemove;
  handler?.call(plugin, editor.view, new MouseEvent("mousemove", { clientX, clientY }));
};

const mousewheel = () => {
  const plugin = getPlugin();
  const handler = plugin.props.handleDOMEvents?.mousewheel;
  handler?.call(plugin, editor.view, new WheelEvent("wheel"));
};

/** Waits long enough for a queued animation frame to run. */
const flushFrame = () => new Promise((resolve) => setTimeout(resolve, 50));

const sideMenu = () => editor.view.dom.parentElement?.querySelector("#editor-side-menu") as HTMLElement | null;

beforeEach(() => {
  // `nodeDOMAtCoords` only returns elements matching the drag-handle selectors,
  // so the hovered node has to be a block paragraph that is not the first child.
  const container = document.createElement("div");
  const first = document.createElement("p");
  first.className = "editor-paragraph-block";
  hovered = document.createElement("p");
  hovered.className = "editor-paragraph-block";
  container.append(first, hovered);

  elementsFromPoint = vi.fn(() => [hovered]);
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    writable: true,
    value: elementsFromPoint,
  });

  editor = new Editor({
    element: document.createElement("div"),
    content: "<p>Paragraph</p>",
    extensions: [StarterKit, SideMenuExtension({ aiEnabled: false, dragDropEnabled: false })],
  });
});

afterEach(() => {
  editor?.destroy();
});

describe("SideMenuExtension mousemove handling", () => {
  it("coalesces a burst of mousemove events into a single update", async () => {
    for (let i = 0; i < 20; i++) {
      mousemove(i, 100 + i);
    }

    // Nothing is measured before the frame runs.
    expect(elementsFromPoint).not.toHaveBeenCalled();

    await flushFrame();

    expect(elementsFromPoint).toHaveBeenCalledTimes(1);
  });

  it("uses the coordinates of the most recent event", async () => {
    mousemove(10, 20);
    mousemove(30, 40);
    mousemove(50, 60);

    await flushFrame();

    expect(elementsFromPoint).toHaveBeenCalledTimes(1);
    expect(elementsFromPoint).toHaveBeenCalledWith(50 + X_OFFSET, 60);
  });

  it("positions the side menu once the frame runs", async () => {
    mousemove(10, 20);

    await flushFrame();

    expect(sideMenu()?.style.left).toBe("-24px");
  });

  it("drops the queued update when the page is scrolled", async () => {
    mousemove(10, 20);
    mousewheel();

    await flushFrame();

    expect(elementsFromPoint).not.toHaveBeenCalled();
  });

  it("drops the queued update when the editor is destroyed", async () => {
    mousemove(10, 20);
    editor.destroy();

    await flushFrame();

    expect(elementsFromPoint).not.toHaveBeenCalled();
  });
});
