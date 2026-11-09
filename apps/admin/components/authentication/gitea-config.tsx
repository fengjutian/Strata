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
import { tr } from "@/lib/admin-i18n";

type Props = {
  disabled: boolean;
  updateConfig: (key: TInstanceAuthenticationMethodKeys, value: string) => void;
};

export const GiteaConfiguration = observer(function GiteaConfiguration(props: Props) {
  const { disabled, updateConfig } = props;
  // store
  const { formattedConfig } = useInstance();
  // derived values
  const GiteaConfig = formattedConfig?.IS_GITEA_ENABLED ?? "";
  const GiteaConfigured =
    !!formattedConfig?.GITEA_HOST && !!formattedConfig?.GITEA_CLIENT_ID && !!formattedConfig?.GITEA_CLIENT_SECRET;

  return (
    <>
      {GiteaConfigured ? (
        <div className="flex items-center gap-4">
          <AnchorButton variant="primary" size="sm" render={<Link href="/authentication/gitea" />} label={tr("Edit")} />
          <Switch
            checked={Boolean(parseInt(GiteaConfig))}
            onCheckedChange={() => {
              Boolean(parseInt(GiteaConfig)) === true
                ? updateConfig("IS_GITEA_ENABLED", "0")
                : updateConfig("IS_GITEA_ENABLED", "1");
            }}
            size="sm"
            aria-label={tr("Enable Gitea")}
            disabled={disabled}
          />
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          stretch="auto"
          nativeButton={false}
          render={<Link href="/authentication/gitea" />}
          icon={<Icon icon={PreferencesOutline} tint="tertiary" />}
          label={tr("Configure")}
        />
      )}
    </>
  );
});
