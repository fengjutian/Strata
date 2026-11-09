/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { ScrollArea } from "@makestrata/propel/components/scroll-area";
// store
import type { TPageInstance } from "@/store/pages/base-page";
// local imports
import { PageContentBrowser } from "../../editor/summary";
import { PageNavigationPaneOutlineTabEmptyState } from "./empty-state/outline";

type Props = {
  page: TPageInstance;
};

export function PageNavigationPaneOutlineTabPanel(props: Props) {
  const { page } = props;
  // derived values
  const {
    editor: { editorRef },
  } = page;

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <ScrollArea orientation="vertical">
        <div className="px-4">
          <PageContentBrowser
            className="mt-0"
            editorRef={editorRef}
            emptyState={<PageNavigationPaneOutlineTabEmptyState />}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
