/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// plugins
import { AIHandlePlugin } from "@/plugins/ai-handle";
import { DragHandlePlugin, nodeDOMAtCoords } from "@/plugins/drag-handle";

type Props = {
  aiEnabled: boolean;
  dragDropEnabled: boolean;
};

export type SideMenuPluginProps = {
  dragHandleWidth: number;
  handlesConfig: {
    ai: boolean;
    dragDrop: boolean;
  };
  scrollThreshold: {
    up: number;
    down: number;
  };
};

/** Shared handle for the side menu plugin, so callers can address it on a state. */
export const SIDE_MENU_PLUGIN_KEY = new PluginKey("sideMenu");

export type SideMenuHandleOptions = {
  view: (view: EditorView, sideMenu: HTMLDivElement | null) => { destroy: () => void } | void;
  domEvents?: {
    [key: string]: (...args: any) => void;
  };
};

export const SideMenuExtension = (props: Props) => {
  const { aiEnabled, dragDropEnabled } = props;

  return Extension.create({
    name: CORE_EXTENSIONS.SIDE_MENU,
    addProseMirrorPlugins() {
      return [
        SideMenu({
          dragHandleWidth: 24,
          handlesConfig: {
            ai: aiEnabled,
            dragDrop: dragDropEnabled,
          },
          scrollThreshold: { up: 200, down: 150 },
        }),
      ];
    },
  });
};

const absoluteRect = (node: Element) => {
  const data = node.getBoundingClientRect();

  return {
    top: data.top,
    left: data.left,
    width: data.width,
  };
};

const SideMenu = (options: SideMenuPluginProps) => {
  const { handlesConfig } = options;
  const editorSideMenu: HTMLDivElement | null = document.createElement("div");
  editorSideMenu.id = "editor-side-menu";
  // side menu view actions
  const hideSideMenu = () => {
    if (!editorSideMenu?.classList.contains("side-menu-hidden")) editorSideMenu?.classList.add("side-menu-hidden");
  };
  const showSideMenu = () => editorSideMenu?.classList.remove("side-menu-hidden");
  // side menu elements
  const { view: dragHandleView, domEvents: dragHandleDOMEvents } = DragHandlePlugin(options);
  const { view: aiHandleView, domEvents: aiHandleDOMEvents } = AIHandlePlugin(options);

  /**
   * Positioning the side menu forces layout (`elementsFromPoint`, `getComputedStyle`,
   * `getBoundingClientRect`) and then writes new styles, so the next event has to lay
   * the document out again. Doing that on every `mousemove` event thrashes layout at
   * mouse-event frequency, so events are coalesced into a single update per frame and
   * only the latest coordinates are used.
   */
  let pendingFrame: number | null = null;
  let pendingView: EditorView | null = null;
  let pendingCoords: { clientX: number; clientY: number } | null = null;

  const cancelPendingUpdate = () => {
    if (pendingFrame !== null) {
      cancelAnimationFrame(pendingFrame);
      pendingFrame = null;
    }
    pendingView = null;
    pendingCoords = null;
  };

  const updateSideMenu = (view: EditorView, clientX: number, clientY: number) => {
    const node = nodeDOMAtCoords({
      x: clientX + 50 + options.dragHandleWidth,
      y: clientY,
    });

    if (!(node instanceof Element) || node.matches("ul, ol")) {
      hideSideMenu();
      return;
    }

    const compStyle = window.getComputedStyle(node);
    const lineHeight = parseInt(compStyle.lineHeight, 10);
    const paddingTop = parseInt(compStyle.paddingTop, 10);

    const rect = absoluteRect(node);

    rect.top += (lineHeight - 20) / 2;
    rect.top += paddingTop;

    if (handlesConfig.ai) {
      rect.left -= 20;
    }

    if (node.parentElement?.parentElement?.matches("td") || node.parentElement?.parentElement?.matches("th")) {
      if (node.matches("ul:not([data-type=taskList]) li, ol li")) {
        rect.left -= 5;
      }
    } else {
      // Li markers
      if (node.matches("ul:not([data-type=taskList]) li, ol li")) {
        rect.left -= 18;
      }
    }

    if (node.matches("table")) {
      rect.top += 8;
      rect.left -= 8;
    }

    rect.width = options.dragHandleWidth;

    if (!editorSideMenu) return;

    editorSideMenu.style.left = `${rect.left - rect.width}px`;
    editorSideMenu.style.top = `${rect.top}px`;
    showSideMenu();
    if (handlesConfig.dragDrop) {
      dragHandleDOMEvents?.mousemove();
    }
    if (handlesConfig.ai) {
      aiHandleDOMEvents?.mousemove?.();
    }
  };

  const scheduleSideMenuUpdate = (view: EditorView, event: MouseEvent) => {
    pendingView = view;
    pendingCoords = { clientX: event.clientX, clientY: event.clientY };

    if (pendingFrame !== null) return;

    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;

      const currentView = pendingView;
      const coords = pendingCoords;
      pendingView = null;
      pendingCoords = null;

      if (!currentView || !coords || !currentView.editable) return;

      updateSideMenu(currentView, coords.clientX, coords.clientY);
    });
  };

  return new Plugin({
    key: SIDE_MENU_PLUGIN_KEY,
    view: (view) => {
      const handleViews: { destroy: () => void }[] = [];
      hideSideMenu();
      view?.dom.parentElement?.appendChild(editorSideMenu);
      // side menu elements' initialization
      if (handlesConfig.ai && !editorSideMenu.querySelector("#ai-handle")) {
        const handleView = aiHandleView(view, editorSideMenu);
        if (handleView) handleViews.push(handleView);
      }

      if (handlesConfig.dragDrop && !editorSideMenu.querySelector("#drag-handle")) {
        const handleView = dragHandleView(view, editorSideMenu);
        if (handleView) handleViews.push(handleView);
      }

      return {
        destroy: () => {
          cancelPendingUpdate();
          handleViews.forEach((handleView) => handleView.destroy());
          editorSideMenu.remove();
        },
      };
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable) return;

          scheduleSideMenuUpdate(view, event);
        },
        // keydown: () => hideSideMenu(),
        mousewheel: () => {
          // A queued update would re-show the menu at a position that is stale after the scroll.
          cancelPendingUpdate();
          hideSideMenu();
        },
        dragenter: (view) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.dragenter?.(view);
          }
        },
        drop: (view, event) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.drop?.(view, event);
          }
        },
        dragend: (view) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.dragend?.(view);
          }
        },
      },
    },
  });
};
