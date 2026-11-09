/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { Switch } from "@makestrata/propel/components/switch";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
import { Skeleton } from "@strata/blocks/skeleton";
import { setToast } from "@strata/blocks/toast";
// hooks
import { useInstance } from "@/hooks/store";
// types
import type { Route } from "./+types/page";
// local
import { InstanceEmailForm } from "./email-config-form";
import { tr } from "@/lib/admin-i18n";

const InstanceEmailPage = observer(function InstanceEmailPage(_props: Route.ComponentProps) {
  // store
  const { fetchInstanceConfigurations, formattedConfig, disableEmail } = useInstance();

  const { isLoading } = useSWR("INSTANCE_CONFIGURATIONS", () => fetchInstanceConfigurations());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSMTPEnabled, setIsSMTPEnabled] = useState(false);

  const handleToggle = async () => {
    if (isSMTPEnabled) {
      setIsSubmitting(true);
      try {
        await disableEmail();
        setIsSMTPEnabled(false);
        setToast({
          title: tr("Email feature disabled"),
          message: tr("Email feature has been disabled"),
          type: "success",
        });
      } catch (_error) {
        setToast({
          title: tr("Error disabling email"),
          message: tr("Failed to disable email feature. Please try again."),
          type: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setIsSMTPEnabled(true);
  };
  useEffect(() => {
    if (formattedConfig) {
      setIsSMTPEnabled(formattedConfig.ENABLE_SMTP === "1");
    }
  }, [formattedConfig]);

  return (
    <PageWrapper
      header={{
        title: tr("Secure emails from your own instance"),
        description: (
          <>
            {tr(
              "Strata can send useful emails to you and your users from your own instance without talking to the Internet."
            )}
            <div className="text-body-xs-regular text-tertiary">
              {tr("Set it up below and please test your settings before you save them.&nbsp;")}
              <span className="text-danger-primary">{tr("Misconfigs can lead to email bounces and errors.")}</span>
            </div>
          </>
        ),
        actions: isLoading ? (
          <Skeleton>
            <Skeleton.Item width="24px" height="16px" className="rounded-full" />
          </Skeleton>
        ) : (
          <Switch
            aria-label={tr("Enable SMTP email")}
            checked={isSMTPEnabled}
            onCheckedChange={handleToggle}
            size="sm"
            disabled={isSubmitting}
          />
        ),
      }}
    >
      {isSMTPEnabled && !isLoading && (
        <>
          {formattedConfig ? (
            <InstanceEmailForm config={formattedConfig} />
          ) : (
            <Skeleton className="space-y-10">
              <Skeleton.Item height="50px" width="75%" />
              <Skeleton.Item height="50px" width="75%" />
              <Skeleton.Item height="50px" width="40%" />
              <Skeleton.Item height="50px" width="40%" />
              <Skeleton.Item height="50px" width="20%" />
            </Skeleton>
          )}
        </>
      )}
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: tr("Email Settings - God Mode") }];

export default InstanceEmailPage;
