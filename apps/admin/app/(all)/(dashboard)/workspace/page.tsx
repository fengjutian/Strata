/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import useSWR from "swr";
import { LoadingOutline as LoaderIcon } from "@makestrata/propel/icons";
// types
import { Button } from "@makestrata/propel/components/button";
import { Switch } from "@makestrata/propel/components/switch";
import { EmptyStateCompact } from "@strata/blocks/empty-state";
import { useTranslation } from "@strata/i18n";
import type { TInstanceConfigurationKeys } from "@strata/types";
import { cn } from "@strata/utils";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
import { Skeleton } from "@strata/blocks/skeleton";
import { WorkspaceListItem } from "@/components/workspace/list-item";
import { setPromiseToast } from "@strata/blocks/toast";
// hooks
import { useInstance, useWorkspace } from "@/hooks/store";
// types
import type { Route } from "./+types/page";
import { tr } from "@/lib/admin-i18n";

const WorkspaceManagementPage = observer(function WorkspaceManagementPage(_props: Route.ComponentProps) {
  // strata hooks
  const { t } = useTranslation();
  // states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // store
  const { formattedConfig, fetchInstanceConfigurations, updateInstanceConfigurations } = useInstance();
  const {
    workspaceIds,
    loader: workspaceLoader,
    paginationInfo,
    fetchWorkspaces,
    fetchNextWorkspaces,
  } = useWorkspace();
  // derived values
  const disableWorkspaceCreation = formattedConfig?.DISABLE_WORKSPACE_CREATION ?? "";
  const hasNextPage = paginationInfo?.next_page_results && paginationInfo?.next_cursor !== undefined;

  // fetch data
  useSWR("INSTANCE_CONFIGURATIONS", () => fetchInstanceConfigurations());
  useSWR("INSTANCE_WORKSPACES", () => fetchWorkspaces());

  const updateConfig = async (key: TInstanceConfigurationKeys, value: string) => {
    setIsSubmitting(true);

    const payload = {
      [key]: value,
    };

    const updateConfigPromise = updateInstanceConfigurations(payload);

    setPromiseToast(updateConfigPromise, {
      loading: "Saving configuration",
      success: {
        title: tr("Success"),
        message: () => "Configuration saved successfully",
      },
      error: {
        title: tr("Error"),
        message: () => "Failed to save configuration",
      },
    });

    await updateConfigPromise
      .then(() => {
        setIsSubmitting(false);
      })
      .catch((err) => {
        console.error(err);
        setIsSubmitting(false);
      });
  };

  return (
    <PageWrapper
      header={{
        title: tr("Workspaces on this instance"),
        description: tr("See all workspaces and control who can create them."),
      }}
    >
      <div className="space-y-3">
        {formattedConfig ? (
          <div className="flex w-full items-start justify-between gap-4 rounded-lg border border-subtle bg-layer-2 px-4 py-3 md:items-center md:gap-8">
            <div className="flex min-w-0 grow items-center gap-4">
              <div className="min-w-0 grow">
                <div className="pb-1 text-body-sm-medium text-primary">
                  {tr("Prevent anyone else from creating a workspace.")}
                </div>
                <div className="text-body-xs-regular leading-5 text-tertiary">
                  {tr(
                    "Toggling this on will let only you create workspaces. You will have to invite users to new workspaces."
                  )}
                </div>
              </div>
            </div>
            <div className={cn("shrink-0", { "opacity-70": isSubmitting })}>
              <div className="flex items-center gap-4">
                <Switch
                  checked={Boolean(parseInt(disableWorkspaceCreation))}
                  onCheckedChange={() => {
                    if (Boolean(parseInt(disableWorkspaceCreation)) === true) {
                      updateConfig("DISABLE_WORKSPACE_CREATION", "0");
                    } else {
                      updateConfig("DISABLE_WORKSPACE_CREATION", "1");
                    }
                  }}
                  size="sm"
                  aria-label={tr("Prevent anyone else from creating a workspace")}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        ) : (
          <Skeleton>
            <Skeleton.Item height="50px" width="100%" />
          </Skeleton>
        )}
        {workspaceLoader !== "init-loader" ? (
          <>
            <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-start gap-x-2">
                <div className="flex items-center gap-2 text-body-md-medium">
                  {tr("All workspaces on this instance")}
                  <span className="text-tertiary">• {workspaceIds.length}</span>
                  {workspaceLoader && ["mutation", "pagination"].includes(workspaceLoader) && (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <div className="text-body-xs-regular leading-5 text-tertiary">
                  {tr(
                    "You can&apos;t yet delete workspaces and you can only go to the workspace if you are an Admin or a Member."
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  stretch="auto"
                  nativeButton={false}
                  render={<Link href="/workspace/create" />}
                  label={tr("Create workspace")}
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 py-2">
              {workspaceIds.length > 0 ? (
                workspaceIds.map((workspaceId) => <WorkspaceListItem key={workspaceId} workspaceId={workspaceId} />)
              ) : paginationInfo ? (
                <EmptyStateCompact
                  assetKey="project"
                  title={t("instance_workspaces.empty_state.title")}
                  description={t("instance_workspaces.empty_state.description")}
                  rootClassName="rounded-lg border border-subtle py-10"
                />
              ) : null}
            </div>
            {hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="md"
                  stretch="auto"
                  onClick={() => fetchNextWorkspaces()}
                  loading={workspaceLoader === "pagination"}
                  label={tr("Load more")}
                />
              </div>
            )}
          </>
        ) : (
          <Skeleton className="space-y-10 py-8">
            <Skeleton.Item height="24px" width="20%" />
            <Skeleton.Item height="92px" width="100%" />
            <Skeleton.Item height="92px" width="100%" />
            <Skeleton.Item height="92px" width="100%" />
          </Skeleton>
        )}
      </div>
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: tr("Workspace Management - God Mode") }];

export default WorkspaceManagementPage;
