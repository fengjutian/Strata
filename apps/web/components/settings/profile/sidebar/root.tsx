/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { ScrollArea } from "@makestrata/propel/components/scroll-area";
import type { TProfileSettingsTabs } from "@strata/types";
import { cn } from "@strata/utils";
// local imports
import { ProfileSettingsSidebarHeader } from "./header";
import { ProfileSettingsSidebarItemCategories } from "./item-categories";

type Props = {
  activeTab: TProfileSettingsTabs;
  className?: string;
  updateActiveTab: (tab: TProfileSettingsTabs) => void;
};

export function ProfileSettingsSidebarRoot(props: Props) {
  const { activeTab, className, updateActiveTab } = props;

  return (
    <div
      className={cn(
        "flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-r-subtle bg-surface-1 px-3 py-4",
        className
      )}
    >
      <ScrollArea orientation="vertical" size="sm">
        <ProfileSettingsSidebarHeader />
        <ProfileSettingsSidebarItemCategories activeTab={activeTab} updateActiveTab={updateActiveTab} />
      </ScrollArea>
    </div>
  );
}
