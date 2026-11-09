/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// strata imports
import { EUserPermissions, EUserPermissionsLevel } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
// ui
import { Button } from "@makestrata/propel/components/button";
import { ModuleOutline } from "@makestrata/propel/icons";
import { Breadcrumbs } from "@strata/blocks/breadcrumb";
import { Header } from "@strata/blocks/layout";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { ModuleViewHeader } from "@/components/modules";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
// strata web imports
import { CommonProjectBreadcrumbs } from "@/components/breadcrumbs/common";
import { useProjectCrumbProps } from "@/components/breadcrumbs/use-project-crumb-props";

export const ModulesListHeader = observer(function ModulesListHeader() {
  // router
  const { workspaceSlug, projectId } = useParams();
  const projectCrumb = useProjectCrumbProps(workspaceSlug?.toString(), projectId?.toString());
  // store hooks
  const { toggleCreateModuleModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();

  const { loader } = useProject();

  const { t } = useTranslation();

  // auth
  const canUserCreateModule = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  return (
    <Header>
      <Header.LeftItem>
        <div>
          <Breadcrumbs isLoading={loader === "init-loader"}>
            <CommonProjectBreadcrumbs
              workspaceSlug={workspaceSlug?.toString()}
              projectId={projectId?.toString()}
              {...projectCrumb}
            />
            <Breadcrumbs.Item
              component={
                <BreadcrumbLink
                  label="Modules"
                  href={`/${workspaceSlug}/projects/${projectId}/modules/`}
                  icon={<ModuleOutline className="h-4 w-4 text-tertiary" />}
                  isLast
                />
              }
              isLast
            />
          </Breadcrumbs>
        </div>
      </Header.LeftItem>
      <Header.RightItem>
        <ModuleViewHeader />
        {canUserCreateModule ? (
          <div className="flex">
            <div className="block sm:hidden">
              <Button
                variant="primary"
                size="md"
                stretch="auto"
                label={t("add")}
                onClick={() => {
                  toggleCreateModuleModal(true);
                }}
              />
            </div>
            <div className="hidden sm:block">
              <Button
                variant="primary"
                size="md"
                stretch="auto"
                label={t("project_module.add_module")}
                onClick={() => {
                  toggleCreateModuleModal(true);
                }}
              />
            </div>
          </div>
        ) : (
          <></>
        )}
      </Header.RightItem>
    </Header>
  );
});
