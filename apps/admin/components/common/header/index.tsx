/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHref } from "react-router";
// icons
import { MenuOutline, SettingsOutline } from "@makestrata/propel/icons";
// strata internal packages
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Breadcrumbs } from "@strata/blocks/breadcrumb";
// hooks
import { useTheme } from "@/hooks/store";
// local imports
import { CORE_HEADER_SEGMENT_LABELS } from "./core";
import { EXTENDED_HEADER_SEGMENT_LABELS } from "./extended";
import { tr } from "@/lib/admin-i18n";

export const HamburgerToggle = observer(function HamburgerToggle() {
  const { isSidebarCollapsed, toggleSidebar } = useTheme();
  return (
    <div className="shrink-0 md:hidden">
      <IconButton
        variant="ghost"
        size="md"
        aria-label={tr("Toggle sidebar")}
        aria-expanded={!isSidebarCollapsed}
        aria-controls="admin-sidebar"
        icon={<Icon icon={MenuOutline} />}
        onClick={() => toggleSidebar(!isSidebarCollapsed)}
      />
    </div>
  );
});

const HEADER_SEGMENT_LABELS = {
  ...CORE_HEADER_SEGMENT_LABELS,
  ...EXTENDED_HEADER_SEGMENT_LABELS,
};

// Function to dynamically generate breadcrumb items based on pathname
const generateBreadcrumbItems = (pathname: string) => {
  const pathSegments = pathname.split("/").filter(Boolean);

  let currentUrl = "";
  const breadcrumbItems = pathSegments.map((segment) => {
    currentUrl += "/" + segment;
    return {
      title: tr(HEADER_SEGMENT_LABELS[segment] ?? segment.toUpperCase()),
      href: currentUrl,
    };
  });
  return breadcrumbItems;
};

type THeaderCrumbProps = {
  label: string;
  /** Omitted for the current page. */
  href?: string;
  icon?: ReactNode;
};

function HeaderCrumb(props: THeaderCrumbProps) {
  const { label, href, icon } = props;

  const crumb = (
    <Breadcrumbs.ItemWrapper label={label} disableTooltip>
      {icon && <Breadcrumbs.Icon>{icon}</Breadcrumbs.Icon>}
      <Breadcrumbs.Label>{label}</Breadcrumbs.Label>
    </Breadcrumbs.ItemWrapper>
  );

  if (!href) return crumb;

  return (
    <Link
      href={href}
      className="flex rounded-md outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-strong focus-visible:outline-solid"
    >
      {crumb}
    </Link>
  );
}

export const AdminHeader = observer(function AdminHeader() {
  const pathName = usePathname();
  // collapsed crumbs render as plain anchors, so their links need the app's base path
  const baseHref = useHref("/");
  const resolveCrumbHref = (path: string) => `${baseHref.replace(/\/+$/, "")}/${path.replace(/^\/+|\/+$/g, "")}/`;

  const breadcrumbItems = generateBreadcrumbItems(pathName || "").filter((item) => item.title);

  return (
    <header className="relative z-10 flex h-header w-full shrink-0 items-center gap-2 border-b border-subtle bg-surface-1 px-4">
      <HamburgerToggle />
      <div className="min-w-0 flex-1">
        <Breadcrumbs>
          <Breadcrumbs.Item
            crumbLabel="Settings"
            crumbHref={resolveCrumbHref("/general/")}
            component={
              <HeaderCrumb
                label={tr("Settings")}
                href="/general/"
                icon={<SettingsOutline className="text-tertiary" />}
              />
            }
          />
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return (
              <Breadcrumbs.Item
                key={item.href}
                crumbLabel={item.title}
                crumbHref={isLast ? undefined : resolveCrumbHref(item.href)}
                component={<HeaderCrumb label={item.title} href={isLast ? undefined : item.href} />}
              />
            );
          })}
        </Breadcrumbs>
      </div>
    </header>
  );
});
