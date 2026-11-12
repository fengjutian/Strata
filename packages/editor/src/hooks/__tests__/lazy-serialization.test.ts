/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Editor } from "@tiptap/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditor } from "../use-editor";

let root: Root;
let container: HTMLDivElement;
let editor: Editor | null = null;

type TOnChange = (json: () => object, html: () => string, options?: { isMigrationUpdate?: boolean }) => void;

const Harness = ({ onChange }: { onChange: TOnChange }) => {
  editor = useEditor({
    disabledExtensions: [],
    editable: true,
    enableHistory: false,
    extendedEditorProps: {},
    fileHandler: {} as never,
    flaggedExtensions: [],
    getEditorMetaData: (() => ({})) as never,
    id: "lazy-serialization",
    initialValue: "<p>hello</p>",
    isTouchDevice: false,
    mentionHandler: {
      searchCallback: async () => ({ results: [] }),
      renderComponent: () => null,
      getMentionedEntityDetails: async () => null,
    } as never,
    onChange,
    placeholder: undefined,
    provider: undefined,
    showPlaceholderOnEmpty: false,
    tabIndex: undefined,
  });

  return null;
};

beforeEach(async () => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  vi.restoreAllMocks();
});

describe("lazy serialization", () => {
  it("does not serialize the document when the consumer does not read it", async () => {
    const getJSON = vi.spyOn(Editor.prototype, "getJSON");
    const getHTML = vi.spyOn(Editor.prototype, "getHTML");

    await act(() => root.render(createElement(Harness, { onChange: () => undefined })));
    await act(() => {
      editor?.commands.insertContentAt(1, "x");
    });

    expect(getJSON).not.toHaveBeenCalled();
    expect(getHTML).not.toHaveBeenCalled();
  });

  it("hands the content over as getters", async () => {
    const changes: Array<{ json: () => object; html: () => string }> = [];

    await act(() =>
      root.render(
        createElement(Harness, {
          onChange: (json, html) => changes.push({ json, html }),
        })
      )
    );
    await act(() => {
      editor?.commands.insertContentAt(1, "x");
    });

    // The unique id extension appends a transaction of its own, so there can be more than one update.
    expect(changes.length).toBeGreaterThan(0);
    changes.forEach((change) => {
      expect(typeof change.json).toBe("function");
      expect(typeof change.html).toBe("function");
    });
  });

  it("reads the current document when the getter is called", async () => {
    const changes: Array<{ json: () => object; html: () => string }> = [];

    await act(() =>
      root.render(
        createElement(Harness, {
          onChange: (json, html) => changes.push({ json, html }),
        })
      )
    );
    await act(() => {
      editor?.commands.insertContentAt(1, "x");
    });

    const latest = changes[changes.length - 1];

    expect(latest.html()).toContain("x");
    expect(latest.json()).toMatchObject({ type: "doc" });
  });
});
