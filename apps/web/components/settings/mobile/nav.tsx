/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRef } from "react";
import { observer } from "mobx-react";
import { useOutsideClickDetector } from "@strata/hooks";
import { useTranslation } from "@strata/i18n";
import { ChevronRightOutline, MenuOutline } from "@makestrata/propel/icons";
import { useUserSettings } from "@/hooks/store/user";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Icon } from "@makestrata/propel/components/icon";

type Props = {
  hamburgerContent: React.ComponentType<{ className?: string; isMobile?: boolean }>;
  activePath: string;
};

export const SettingsMobileNav = observer(function SettingsMobileNav(props: Props) {
  const { hamburgerContent: HamburgerContent, activePath } = props;
  // refs
  const sidebarRef = useRef<HTMLDivElement>(null);
  // store hooks
  const { sidebarCollapsed, toggleSidebar } = useUserSettings();
  const { t } = useTranslation();

  useOutsideClickDetector(sidebarRef, () => {
    if (!sidebarCollapsed) toggleSidebar(true);
  });

  return (
    <div className="flex items-center gap-4 border-b border-subtle px-page-x py-3 md:hidden">
      <div ref={sidebarRef} className="relative z-50 w-fit">
        {!sidebarCollapsed && (
          <div className="absolute top-10.5 left-0 z-50">
            <HamburgerContent className="max-h-100 rounded-lg border border-subtle pb-3" />
          </div>
        )}
        <IconButton
          variant="secondary"
          size="sm"
          render={<button type="button" className="group z-50 shrink-0" />}
          icon={<Icon icon={MenuOutline} />}
          aria-label="Toggle settings menu"
          onClick={() => toggleSidebar()}
        />
      </div>
      {/* path */}
      <div className="flex items-center gap-2">
        <ChevronRightOutline className="size-4 text-tertiary" />
        <span className="text-body-xs-medium text-secondary">{t(activePath)}</span>
      </div>
    </div>
  );
});
