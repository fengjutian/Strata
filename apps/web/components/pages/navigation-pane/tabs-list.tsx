/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { Tab, TabsList } from "@makestrata/propel/components/tabs";
import { useTranslation } from "@strata/i18n";
// strata web components
import { ORDERED_PAGE_NAVIGATION_TABS_LIST } from "@/components/pages/navigation-pane/tab-panels";

export function PageNavigationPaneTabsList() {
  // translation
  const { t } = useTranslation();

  return (
    <div className="w-full px-3.5">
      <TabsList>
        {ORDERED_PAGE_NAVIGATION_TABS_LIST.map((tab) => (
          <Tab key={tab.key} value={tab.key} label={t(tab.i18n_label)} />
        ))}
      </TabsList>
    </div>
  );
}
