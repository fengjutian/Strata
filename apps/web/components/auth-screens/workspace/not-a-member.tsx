/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
// ui
import { Button } from "@makestrata/propel/components/button";
import { useTranslation } from "@strata/i18n";
// layouts
import DefaultLayout from "@/layouts/default-layout";

export function NotAWorkspaceMember() {
  const { t } = useTranslation();

  return (
    <DefaultLayout>
      <div className="grid h-full place-items-center p-4">
        <div className="space-y-8 text-center">
          <div className="space-y-2">
            <h3 className="text-h6-semibold">{t("workspace_access.not_authorized.title")}</h3>
            <p className="mx-auto w-1/2 text-body-xs-regular text-secondary">
              {t("workspace_access.not_authorized.description")}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              stretch="auto"
              label={t("workspace_access.check_pending_invites")}
              nativeButton={false}
              render={<Link href="/invitations" />}
            />
            <Button
              variant="primary"
              size="sm"
              stretch="auto"
              label={t("create_workspace")}
              nativeButton={false}
              render={<Link href="/create-workspace" />}
            />
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
