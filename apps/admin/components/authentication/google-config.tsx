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

export const GoogleConfiguration = observer(function GoogleConfiguration(props: Props) {
  const { disabled, updateConfig } = props;
  // store
  const { formattedConfig } = useInstance();
  // derived values
  const enableGoogleConfig = formattedConfig?.IS_GOOGLE_ENABLED ?? "";
  const isGoogleConfigured = !!formattedConfig?.GOOGLE_CLIENT_ID && !!formattedConfig?.GOOGLE_CLIENT_SECRET;

  return (
    <>
      {isGoogleConfigured ? (
        <div className="flex items-center gap-4">
          <AnchorButton
            variant="primary"
            size="sm"
            render={<Link href="/authentication/google" />}
            label={tr("Edit")}
          />
          <Switch
            checked={Boolean(parseInt(enableGoogleConfig))}
            onCheckedChange={() => {
              const newEnableGoogleConfig = Boolean(parseInt(enableGoogleConfig)) === true ? "0" : "1";
              updateConfig("IS_GOOGLE_ENABLED", newEnableGoogleConfig);
            }}
            size="sm"
            aria-label={tr("Enable Google")}
            disabled={disabled}
          />
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          stretch="auto"
          nativeButton={false}
          render={<Link href="/authentication/google" />}
          icon={<Icon icon={PreferencesOutline} tint="tertiary" />}
          label={tr("Configure")}
        />
      )}
    </>
  );
});
