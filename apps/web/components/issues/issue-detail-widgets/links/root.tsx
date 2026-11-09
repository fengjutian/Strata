/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// strata imports
import { EntityDetailWidgetSection } from "@strata/blocks/entity-detail";
import { useTranslation } from "@strata/i18n";
import type { TIssueServiceType } from "@strata/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// local imports
import { IssueLinksCollapsibleContent } from "./content";
import { IssueLinksActionButton } from "./quick-action-button";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
  issueServiceType: TIssueServiceType;
};

export const LinksCollapsible = observer(function LinksCollapsible(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled = false, issueServiceType } = props;
  // translation
  const { t } = useTranslation();
  // store hooks
  const {
    openWidgets,
    toggleOpenWidget,
    issue: { getIssueById },
  } = useIssueDetail(issueServiceType);
  // derived values
  const isCollapsibleOpen = openWidgets.includes("links");
  const linksCount = getIssueById(issueId)?.link_count ?? 0;

  return (
    <EntityDetailWidgetSection
      title={t("common.links")}
      count={linksCount}
      isOpen={isCollapsibleOpen}
      onToggle={() => toggleOpenWidget("links")}
      actions={
        !disabled ? <IssueLinksActionButton issueServiceType={issueServiceType} disabled={disabled} /> : undefined
      }
    >
      <IssueLinksCollapsibleContent
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        issueId={issueId}
        disabled={disabled}
        issueServiceType={issueServiceType}
      />
    </EntityDetailWidgetSection>
  );
});
