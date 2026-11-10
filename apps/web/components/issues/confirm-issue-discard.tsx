/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
// ui
import { Button } from "@makestrata/propel/components/button";
import { useTranslation } from "@strata/i18n";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogHeading,
  DialogInfo,
  DialogMain,
  DialogTitle,
} from "@makestrata/propel/components/dialog";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  onDiscard: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmIssueDiscard(props: Props) {
  const { isOpen, handleClose, onDiscard, onConfirm } = props;
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);

  const onClose = () => {
    handleClose();
    setIsLoading(false);
  };

  const handleDeletion = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent size="md">
        <DialogMain>
          <DialogHeader>
            <DialogHeading>
              <DialogTitle>{t("save_this_draft")}</DialogTitle>
              <DialogDescription>{t("save_this_draft_description")}</DialogDescription>
            </DialogHeading>
          </DialogHeader>
        </DialogMain>
        <DialogActions>
          <DialogInfo>
            <Button variant="secondary" size="sm" stretch="auto" onClick={onDiscard} label={t("discard")} />
          </DialogInfo>
          <Button variant="secondary" size="sm" stretch="auto" onClick={onClose} label={t("cancel")} />
          <Button
            variant="primary"
            size="sm"
            stretch="auto"
            onClick={() => void handleDeletion()}
            loading={isLoading}
            label={t(isLoading ? "saving" : "save_to_drafts")}
          />
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
