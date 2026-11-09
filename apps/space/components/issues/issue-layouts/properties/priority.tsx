/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { PrioritySelect } from "@strata/blocks/property-select";
import type { SelectVariant } from "@strata/blocks/select";
import { useTranslation } from "@strata/i18n";
import type { TIssuePriorities } from "@strata/types";
import { cn } from "@strata/utils";
// helpers
import { READ_ONLY_SELECT_CLASSNAME } from "@/helpers/select.helper";

type Props = {
  priority: TIssuePriorities | null;
  variant?: SelectVariant;
  className?: string;
};

/** The work item priority as a read-only `PrioritySelect` chip. */
export function IssueBlockPriority(props: Props) {
  const { priority, variant = "pill-md", className } = props;
  // i18n
  const { t } = useTranslation();

  return (
    <PrioritySelect
      value={priority ?? "none"}
      onChange={() => {}}
      variant={variant}
      placeholder={t("common.priority")}
      className={cn(READ_ONLY_SELECT_CLASSNAME, className)}
      tooltip={{ heading: t("common.priority"), emptyContent: t("common.none") }}
      disabled
    />
  );
}
