/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import type { IMarking } from "@strata/editor";
import { cn } from "@strata/utils";

export type THeadingComponentProps = {
  marking: IMarking;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
};

const COMMON_CLASSNAME =
  "flex-shrink-0 w-full py-1 text-left font-medium text-tertiary hover:text-accent-primary truncate transition-colors";

export function OutlineHeading1({ marking, onClick }: THeadingComponentProps) {
  return (
    <button type="button" onClick={onClick} className={cn(COMMON_CLASSNAME, "pl-1 text-body-xs-regular")}>
      {marking.text}
    </button>
  );
}

export function OutlineHeading2({ marking, onClick }: THeadingComponentProps) {
  return (
    <button type="button" onClick={onClick} className={cn(COMMON_CLASSNAME, "pl-2 text-caption-sm-regular")}>
      {marking.text}
    </button>
  );
}

export function OutlineHeading3({ marking, onClick }: THeadingComponentProps) {
  return (
    <button type="button" onClick={onClick} className={cn(COMMON_CLASSNAME, "pl-4 text-caption-sm-regular")}>
      {marking.text}
    </button>
  );
}
