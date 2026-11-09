/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// hooks
import { Switch } from "@makestrata/propel/components/switch";
import type { TInstanceAuthenticationMethodKeys } from "@strata/types";
import { useInstance } from "@/hooks/store";
import { tr } from "@/lib/admin-i18n";
// ui
// types

type Props = {
  disabled: boolean;
  updateConfig: (key: TInstanceAuthenticationMethodKeys, value: string) => void;
};

export const EmailCodesConfiguration = observer(function EmailCodesConfiguration(props: Props) {
  const { disabled, updateConfig } = props;
  // store
  const { formattedConfig } = useInstance();
  // derived values
  const enableMagicLogin = formattedConfig?.ENABLE_MAGIC_LINK_LOGIN ?? "";

  return (
    <Switch
      checked={Boolean(parseInt(enableMagicLogin))}
      onCheckedChange={() => {
        const newEnableMagicLogin = Boolean(parseInt(enableMagicLogin)) === true ? "0" : "1";
        updateConfig("ENABLE_MAGIC_LINK_LOGIN", newEnableMagicLogin);
      }}
      size="sm"
      aria-label={tr("Enable login with email codes")}
      disabled={disabled}
    />
  );
});
