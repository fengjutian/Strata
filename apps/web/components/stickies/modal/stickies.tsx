/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// strata imports
import { Button } from "@makestrata/propel/components/button";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { ScrollArea } from "@makestrata/propel/components/scroll-area";
import { AddOutline, CloseOutline, MultipleStickyOutline } from "@makestrata/propel/icons";
import { useTranslation } from "@strata/i18n";
// hooks
import { useSticky } from "@/hooks/use-stickies";
// components
import { StickiesTruncated } from "../layout/stickies-truncated";
import { useStickyOperations } from "../sticky/use-operations";
import { StickySearch } from "./search";

type TProps = {
  handleClose?: () => void;
};

export const Stickies = observer(function Stickies(props: TProps) {
  const { handleClose } = props;
  // navigation
  const { workspaceSlug } = useParams();
  // strata hooks
  const { t } = useTranslation();
  // store hooks
  const { creatingSticky, toggleShowNewSticky } = useSticky();
  // sticky operations
  const { stickyOperations } = useStickyOperations({ workspaceSlug: workspaceSlug?.toString() });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* header */}
      <div className="flex items-center justify-between p-6">
        {/* Title */}
        <div className="flex items-center gap-2 text-secondary">
          <MultipleStickyOutline className="size-5 shrink-0" />
          <p className="text-h5-medium">{t("stickies.title")}</p>
        </div>
        {/* actions */}
        <div className="flex items-center gap-3">
          <StickySearch />
          <Button
            variant="secondary"
            size="sm"
            stretch="auto"
            icon={<Icon icon={AddOutline} />}
            label={t("stickies.add")}
            loading={creatingSticky}
            onClick={() => {
              toggleShowNewSticky(true);
              void stickyOperations.create();
            }}
          />
          {handleClose && (
            <IconButton
              variant="ghost"
              size="xs"
              icon={<Icon icon={CloseOutline} />}
              aria-label={t("close")}
              showTooltip={false}
              onClick={handleClose}
            />
          )}
        </div>
      </div>
      {/* content: scrolls under the pinned header, out to the popup's edges */}
      <ScrollArea orientation="vertical" size="sm">
        <div className="px-6 pb-4">
          <StickiesTruncated handleClose={handleClose} />
        </div>
      </ScrollArea>
    </div>
  );
});
