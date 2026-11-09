/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import type { UseFormGetValues } from "react-hook-form";
// strata imports
import { useTranslation } from "@strata/i18n";
import { Button } from "@makestrata/propel/components/button";
import { setToast } from "@strata/blocks/toast";
import type { IUserTheme } from "@strata/types";

type Props = {
  getValues: UseFormGetValues<IUserTheme>;
};

export const CustomThemeDownloadConfigButton = observer(function CustomThemeDownloadConfigButton(props: Props) {
  const { getValues } = props;
  // translation
  const { t } = useTranslation();

  const handleDownloadConfig = () => {
    try {
      const currentValues = getValues();
      const config = {
        version: "1.0",
        themeName: "Custom Theme",
        primary: currentValues.primary,
        background: currentValues.background,
        darkPalette: currentValues.darkPalette,
      };

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `strata-theme-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({
        type: "success",
        title: t("success"),
        message: "Theme configuration downloaded successfully.",
      });
    } catch (error) {
      console.error("Failed to download config:", error);
      setToast({
        type: "error",
        title: t("error"),
        message: "Failed to download theme configuration.",
      });
    }
  };

  return (
    <Button
      variant="secondary"
      size="md"
      stretch="auto"
      type="button"
      label="Download config"
      onClick={handleDownloadConfig}
    />
  );
});
