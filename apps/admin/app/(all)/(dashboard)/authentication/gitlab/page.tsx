/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { Switch } from "@makestrata/propel/components/switch";
// assets
import GitlabLogo from "@/app/assets/logos/gitlab-logo.svg?url";
// components
import { AuthenticationMethodCard } from "@/components/authentication/authentication-method-card";
import { PageWrapper } from "@/components/common/page-wrapper";
import { Skeleton } from "@strata/blocks/skeleton";
import { setPromiseToast } from "@strata/blocks/toast";
// hooks
import { useInstance } from "@/hooks/store";
// types
import type { Route } from "./+types/page";
// local
import { InstanceGitlabConfigForm } from "./form";
import { tr } from "@/lib/admin-i18n";

const InstanceGitlabAuthenticationPage = observer(function InstanceGitlabAuthenticationPage(
  _props: Route.ComponentProps
) {
  // store
  const { fetchInstanceConfigurations, formattedConfig, updateInstanceConfigurations } = useInstance();
  // state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // config
  const enableGitlabConfig = formattedConfig?.IS_GITLAB_ENABLED ?? "";

  useSWR("INSTANCE_CONFIGURATIONS", () => fetchInstanceConfigurations());

  const updateConfig = async (key: "IS_GITLAB_ENABLED", value: string) => {
    setIsSubmitting(true);

    const payload = {
      [key]: value,
    };

    const updateConfigPromise = updateInstanceConfigurations(payload);

    setPromiseToast(updateConfigPromise, {
      loading: "Saving Configuration",
      success: {
        title: tr("Configuration saved"),
        message: () => `GitLab authentication is now ${value === "1" ? "active" : "disabled"}.`,
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
      customHeader={
        <AuthenticationMethodCard
          name="GitLab"
          description={tr("Allow members to login or sign up to strata with their GitLab accounts.")}
          icon={<img src={GitlabLogo} height={24} width={24} alt={tr("GitLab Logo")} />}
          config={
            <Switch
              aria-label={tr("Enable GitLab authentication")}
              checked={Boolean(parseInt(enableGitlabConfig))}
              onCheckedChange={() => {
                if (Boolean(parseInt(enableGitlabConfig)) === true) {
                  updateConfig("IS_GITLAB_ENABLED", "0");
                } else {
                  updateConfig("IS_GITLAB_ENABLED", "1");
                }
              }}
              size="sm"
              disabled={isSubmitting || !formattedConfig}
            />
          }
          disabled={isSubmitting || !formattedConfig}
          withBorder={false}
        />
      }
    >
      {formattedConfig ? (
        <InstanceGitlabConfigForm config={formattedConfig} />
      ) : (
        <Skeleton className="space-y-8">
          <Skeleton.Item height="50px" width="25%" />
          <Skeleton.Item height="50px" />
          <Skeleton.Item height="50px" />
          <Skeleton.Item height="50px" />
          <Skeleton.Item height="50px" width="50%" />
        </Skeleton>
      )}
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: tr("GitLab Authentication - God Mode") }];

export default InstanceGitlabAuthenticationPage;
