/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// ui
import { Dialog, DialogBody, DialogContent, DialogMain } from "@makestrata/propel/components/dialog";
import { useTranslation } from "@strata/i18n";
// components
import { ProductUpdatesFooter } from "@/components/global";
// strata web components
import { ProductUpdatesChangelog } from "@/components/global/product-updates/changelog";
import { ProductUpdatesHeader } from "@/components/global/product-updates/header";

export type ProductUpdatesModalProps = {
  isOpen: boolean;
  handleClose: () => void;
};

export const ProductUpdatesModal = observer(function ProductUpdatesModal(props: ProductUpdatesModalProps) {
  const { isOpen, handleClose } = props;
  // strata hooks
  const { t } = useTranslation();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent size="lg" aria-label={t("whats_new")}>
        <ProductUpdatesHeader />
        <DialogMain>
          <DialogBody tabIndex={0}>
            <ProductUpdatesChangelog />
          </DialogBody>
        </DialogMain>
        <ProductUpdatesFooter />
      </DialogContent>
    </Dialog>
  );
});
