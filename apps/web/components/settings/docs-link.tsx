/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { AnchorButton } from "@makestrata/propel/components/anchor-button";
import { useTranslation } from "@strata/i18n";

type Props = {
  href: string;
};

/** A compact "Docs" link that opens the matching help-center page in a new tab. */
export function SettingsDocsLink({ href }: Props) {
  const { t } = useTranslation();

  return (
    <span className="ms-1 inline-flex align-middle">
      <AnchorButton variant="secondary" size="xs" href={href} external label={t("docs")} />
    </span>
  );
}
