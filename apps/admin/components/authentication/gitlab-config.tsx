/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
// icons
import { PreferencesOutline } from "@makestrata/propel/icons";
// strata internal packages
import { AnchorButton } from "@makestrata/propel/components/anchor-button";
import { Button } from "@makestrata/propel/components/button";
import { Icon } from "@makestrata/propel/components/icon";
import { Switch } from "@makestrata/propel/components/switch";
import type { TInstanceAuthenticationMethodKeys } from "@strata/types";
// hooks
import { useInstance } from "@/hooks/store";

type Props = {
  disabled: boolean;
  updateConfig: (key: TInstanceAuthenticationMethodKeys, value: string) => void;
};

export const GitlabConfiguration = observer(function GitlabConfiguration(props: Props) {
  const { disabled, updateConfig } = props;
  // store
  const { formattedConfig } = useInstance();
  // derived values
  const enableGitlabConfig = formattedConfig?.IS_GITLAB_ENABLED ?? "";
  const isGitlabConfigured = !!formattedConfig?.GITLAB_CLIENT_ID && !!formattedConfig?.GITLAB_CLIENT_SECRET;

  return (
    <>
      {isGitlabConfigured ? (
        <div className="flex items-center gap-4">
          <AnchorButton variant="primary" size="sm" render={<Link href="/authentication/gitlab" />} label="Edit" />
          <Switch
            checked={Boolean(parseInt(enableGitlabConfig))}
            onCheckedChange={() => {
              const newEnableGitlabConfig = Boolean(parseInt(enableGitlabConfig)) === true ? "0" : "1";
              updateConfig("IS_GITLAB_ENABLED", newEnableGitlabConfig);
            }}
            size="sm"
            aria-label="Enable GitLab"
            disabled={disabled}
          />
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          stretch="auto"
          nativeButton={false}
          render={<Link href="/authentication/gitlab" />}
          icon={<Icon icon={PreferencesOutline} tint="tertiary" />}
          label="Configure"
        />
      )}
    </>
  );
});
