/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { ISSUE_PRIORITIES } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { PriorityIcon } from "@strata/blocks/icons";
import type { TIssuePriorities } from "@strata/types";
import { cn } from "@strata/utils";

export type TReadonlyPriorityProps = {
  className?: string;
  hideIcon?: boolean;
  value: TIssuePriorities | undefined | null;
  placeholder?: string;
};

export const ReadonlyPriority = observer(function ReadonlyPriority(props: TReadonlyPriorityProps) {
  const { className, hideIcon = false, value, placeholder } = props;

  const { t } = useTranslation();
  const priorityDetails = ISSUE_PRIORITIES.find((p) => p.key === value);

  return (
    <div className={cn("flex items-center gap-1 text-body-xs-regular", className)}>
      {!hideIcon && <PriorityIcon priority={value ?? "none"} className="size-4" />}
      <span className="flex-grow truncate">{priorityDetails?.title ?? placeholder ?? t("common.none")}</span>
    </div>
  );
});
