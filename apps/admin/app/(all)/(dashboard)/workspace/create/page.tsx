/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
// types
import type { Route } from "./+types/page";
// local
import { WorkspaceCreateForm } from "./form";
import { tr } from "@/lib/admin-i18n";

const WorkspaceCreatePage = observer(function WorkspaceCreatePage(_props: Route.ComponentProps) {
  return (
    <PageWrapper
      header={{
        title: tr("Create a new workspace on this instance."),
        description: tr("You will need to invite users from Workspace Settings after you create this workspace."),
      }}
    >
      <WorkspaceCreateForm />
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: tr("Create Workspace - God Mode") }];

export default WorkspaceCreatePage;
