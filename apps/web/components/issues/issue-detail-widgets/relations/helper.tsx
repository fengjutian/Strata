/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
// strata imports
import { useTranslation } from "@strata/i18n";
import { setToast } from "@strata/blocks/toast";
import type { TIssue, TIssueServiceType } from "@strata/types";
import { EIssueServiceType } from "@strata/types";
import { copyUrlToClipboard } from "@strata/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

export type TRelationIssueOperations = {
  copyLink: (path: string) => void;
  update: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>;
  remove: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
};

export const useRelationOperations = (
  issueServiceType: TIssueServiceType = EIssueServiceType.ISSUES
): TRelationIssueOperations => {
  const { updateIssue, removeIssue } = useIssueDetail(issueServiceType);
  const { t } = useTranslation();
  // derived values
  const entityName = issueServiceType === EIssueServiceType.ISSUES ? "Work item" : "Epic";

  const issueOperations: TRelationIssueOperations = useMemo(
    () => ({
      copyLink: async (path) => {
        await copyUrlToClipboard(path);
        setToast({
          type: "success",
          title: t("common.link_copied"),
          message: t("entity.link_copied_to_clipboard", { entity: entityName }),
        });
      },
      update: async (workspaceSlug, projectId, issueId, data) => {
        try {
          await updateIssue(workspaceSlug, projectId, issueId, data);
          setToast({
            title: t("toast.success"),
            type: "success",
            message: t("entity.update.success", { entity: entityName }),
          });
        } catch (_error) {
          setToast({
            title: t("toast.error"),
            type: "error",
            message: t("entity.update.failed", { entity: entityName }),
          });
        }
      },
      remove: async (workspaceSlug, projectId, issueId) => {
        return removeIssue(workspaceSlug, projectId, issueId);
      },
    }),
    [entityName, removeIssue, t, updateIssue]
  );

  return issueOperations;
};
