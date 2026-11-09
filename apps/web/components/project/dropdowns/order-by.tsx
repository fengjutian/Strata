/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@makestrata/propel/components/menu";
import { Button as ButtonElement } from "@makestrata/propel/elements/button";
import { SortDescendingOutline } from "@makestrata/propel/icons";
// strata imports
import { PROJECT_ORDER_BY_OPTIONS } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import type { TProjectOrderByOptions } from "@strata/types";

type Props = {
  onChange: (value: TProjectOrderByOptions) => void;
  value: TProjectOrderByOptions | undefined;
  isMobile?: boolean;
};

const DISABLED_ORDERING_OPTIONS = new Set(["sort_order"]);

export function ProjectOrderByDropdown(props: Props) {
  const { onChange, value, isMobile = false } = props;
  const { t } = useTranslation();

  const orderByDetails = PROJECT_ORDER_BY_OPTIONS.find((option) => value?.includes(option.key));

  const isDescending = value?.[0] === "-";
  const isOrderingDisabled = !!value && DISABLED_ORDERING_OPTIONS.has(value);

  return (
    <Menu>
      <div className={isMobile ? "flex w-full justify-center" : undefined}>
        {/* `getButtonStyling` has no Propel counterpart: the trigger borrows the styled button element
            and Base UI grafts the menu behaviour onto it. */}
        <MenuTrigger
          nativeButton={false}
          render={<ButtonElement variant="secondary" size="md" stretch="auto" render={<span />} />}
        >
          <SortDescendingOutline className="size-3.5 shrink-0" />
          {orderByDetails && t(orderByDetails?.i18n_label)}
        </MenuTrigger>
      </div>
      <MenuContent side="bottom" align="end">
        {PROJECT_ORDER_BY_OPTIONS.map((option) => (
          <MenuItem
            key={option.key}
            label={t(option.i18n_label)}
            selected={!!value?.includes(option.key)}
            onClick={() => {
              if (isDescending)
                onChange(option.key == "sort_order" ? option.key : (`-${option.key}` as TProjectOrderByOptions));
              else onChange(option.key);
            }}
          />
        ))}
        <MenuSeparator />
        <MenuItem
          label={t("common.sort.asc")}
          selected={!isOrderingDisabled && !isDescending}
          disabled={isOrderingDisabled}
          onClick={() => {
            if (isDescending) onChange(value.slice(1) as TProjectOrderByOptions);
          }}
        />
        <MenuItem
          label={t("common.sort.desc")}
          selected={!isOrderingDisabled && isDescending}
          disabled={isOrderingDisabled}
          onClick={() => {
            if (!isDescending) onChange(`-${value}` as TProjectOrderByOptions);
          }}
        />
      </MenuContent>
    </Menu>
  );
}
