/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { StrataToastProvider } from "@strata/blocks/toast";

/**
 * The toast viewport comes from `@strata/blocks/toast`, which mounts Propel's `ToastProvider` and
 * binds it to the shared toast manager. It reads the theme off the CSS variables, so there is no
 * `theme` prop. It calls `useTranslation`, so this must stay inside `TranslationProvider` (see
 * `app/providers.tsx`).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <StrataToastProvider>{children}</StrataToastProvider>;
}
