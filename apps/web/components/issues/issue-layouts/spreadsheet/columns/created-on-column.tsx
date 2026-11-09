/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// types
import type { TIssue } from "@strata/types";
// helpers
import { Row } from "@strata/blocks/layout";
import { renderFormattedDate } from "@strata/utils";

type Props = {
  issue: TIssue;
};

export const SpreadsheetCreatedOnColumn = observer(function SpreadsheetCreatedOnColumn(props: Props) {
  const { issue } = props;

  return (
    <Row className="flex h-11 w-full items-center border-b-[0.5px] border-subtle group-[.selected-issue-row]:bg-accent-primary/5 hover:bg-layer-transparent-hover group-[.selected-issue-row]:hover:bg-accent-primary/10">
      {renderFormattedDate(issue.created_at)}
    </Row>
  );
});
