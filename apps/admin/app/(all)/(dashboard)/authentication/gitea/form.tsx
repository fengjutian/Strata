/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { isEmpty } from "lodash-es";
import { useWatch } from "react-hook-form";
// strata internal packages
import { API_BASE_URL } from "@strata/constants";
import type { IFormattedInstanceConfiguration, TInstanceGiteaAuthenticationConfigurationKeys } from "@strata/types";
// components
import { CodeBlock } from "@/components/common/code-block";
import type { TControllerInputFormField } from "@/components/common/controller-input";
import type { TControllerSwitchFormField } from "@/components/common/controller-switch";
import type { TCopyField } from "@/components/common/copy-field";
import { OAuthProviderForm } from "@/components/authentication/oauth-provider-form";
// hooks
import { useOAuthProviderConfigForm } from "@/hooks/use-oauth-provider-config-form";
import { tr } from "@/lib/admin-i18n";

type Props = {
  config: IFormattedInstanceConfiguration;
};

type GiteaConfigFormValues = Record<TInstanceGiteaAuthenticationConfigurationKeys, string>;

const GITEA_FORM_SWITCH_FIELD: TControllerSwitchFormField<GiteaConfigFormValues> = {
  name: "ENABLE_GITEA_SYNC",
  label: "Gitea",
};

export function InstanceGiteaConfigForm(props: Props) {
  const { config } = props;
  // form data
  const {
    control,
    formState: { errors },
    onSave,
  } = useOAuthProviderConfigForm<GiteaConfigFormValues>("Gitea", {
    GITEA_HOST: config["GITEA_HOST"] || "https://gitea.com",
    GITEA_CLIENT_ID: config["GITEA_CLIENT_ID"],
    GITEA_CLIENT_SECRET: config["GITEA_CLIENT_SECRET"],
    ENABLE_GITEA_SYNC: config["ENABLE_GITEA_SYNC"] || "0",
  });
  // subscribed so the settings link follows host edits
  const giteaHost = useWatch({ control, name: "GITEA_HOST" });

  const originURL = !isEmpty(API_BASE_URL) ? API_BASE_URL : typeof window !== "undefined" ? window.location.origin : "";

  const GITEA_FORM_FIELDS: TControllerInputFormField<GiteaConfigFormValues>[] = [
    {
      key: "GITEA_HOST",
      type: "text",
      label: tr("Gitea Host"),
      description: (
        <>
          {tr(
            "Use the URL of your Gitea instance. For the official Gitea instance, use &quot;https://gitea.com&quot;."
          )}
        </>
      ),
      placeholder: "https://gitea.com",
      error: Boolean(errors.GITEA_HOST),
      required: true,
    },
    {
      key: "GITEA_CLIENT_ID",
      type: "text",
      label: tr("Client ID"),
      description: (
        <>
          You will get this from your{" "}
          <a
            href="https://gitea.com/user/settings/applications"
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            {tr("Gitea OAuth application settings.")}
          </a>
        </>
      ),
      placeholder: "70a44354520df8bd9bcd",
      error: Boolean(errors.GITEA_CLIENT_ID),
      required: true,
    },
    {
      key: "GITEA_CLIENT_SECRET",
      type: "password",
      label: tr("Client secret"),
      description: (
        <>
          Your client secret is also found in your{" "}
          <a
            href="https://gitea.com/user/settings/applications"
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            {tr("Gitea OAuth application settings.")}
          </a>
        </>
      ),
      placeholder: "9b0050f94ec1b744e32ce79ea4ffacd40d4119cb",
      error: Boolean(errors.GITEA_CLIENT_SECRET),
      required: true,
    },
  ];

  const GITEA_SERVICE_FIELD: TCopyField[] = [
    {
      key: "Callback_URI",
      label: tr("Callback URI"),
      url: `${originURL}/auth/gitea/callback/`,
      description: (
        <>
          {tr("We will auto-generate this. Paste this into your")}
          <CodeBlock darkerShade>{tr("Authorized Callback URI")}</CodeBlock> field{" "}
          <a
            href={`${giteaHost || "https://gitea.com"}/user/settings/applications`}
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
            aria-label={tr("Gitea OAuth application settings")}
          >
            here.
          </a>
        </>
      ),
    },
  ];

  return (
    <OAuthProviderForm
      providerName="Gitea"
      control={control}
      formFields={GITEA_FORM_FIELDS}
      switchField={GITEA_FORM_SWITCH_FIELD}
      onSave={onSave}
      serviceDetails={GITEA_SERVICE_FIELD}
    />
  );
}
