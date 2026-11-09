/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useTranslation } from "@strata/i18n";
// ui
import { Button } from "@makestrata/propel/components/button";
import { DialogActions, DialogInfo } from "@makestrata/propel/components/dialog";
import { StrataLogo } from "@strata/blocks/icons";

export function ProductUpdatesFooter() {
  const { t } = useTranslation();
  return (
    <DialogActions>
      <DialogInfo>
        <div className="flex items-center gap-2">
          <a
            href="https://go.strata.so/p-docs"
            target="_blank"
            className="text-body-xs-regular text-secondary underline-offset-1 outline-none hover:text-primary hover:underline"
            rel="noreferrer"
          >
            {t("docs")}
          </a>
          <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
            <circle cx={1} cy={1} r={1} />
          </svg>
          <a
            href="https://go.strata.so/p-changelog"
            target="_blank"
            className="text-body-xs-regular text-secondary underline-offset-1 outline-none hover:text-primary hover:underline"
            rel="noreferrer"
          >
            {t("full_changelog")}
          </a>
          <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
            <circle cx={1} cy={1} r={1} />
          </svg>
          <a
            href="mailto:support@strata.so"
            target="_blank"
            className="text-body-xs-regular text-secondary underline-offset-1 outline-none hover:text-primary hover:underline"
            rel="noreferrer"
          >
            {t("support")}
          </a>
          <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
            <circle cx={1} cy={1} r={1} />
          </svg>
          <a
            href="https://forum.strata.so"
            target="_blank"
            className="text-body-xs-regular text-secondary underline-offset-1 outline-none hover:text-primary hover:underline"
            rel="noreferrer"
          >
            Forum
          </a>
        </div>
      </DialogInfo>
      <Button
        variant="secondary"
        size="sm"
        stretch="auto"
        nativeButton={false}
        render={
          <a
            href="https://strata.so/pages"
            target="_blank"
            rel="noreferrer"
            aria-label={t("powered_by_strata_pages")}
          />
        }
        icon={<StrataLogo className="h-4 w-auto text-primary" />}
        label={t("powered_by_strata_pages")}
      />
    </DialogActions>
  );
}
