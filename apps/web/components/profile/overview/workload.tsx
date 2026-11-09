/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata imports
import { STATE_GROUPS } from "@strata/constants";
// types
import { useTranslation } from "@strata/i18n";
import type { IUserStateDistribution } from "@strata/types";
import { Card } from "@strata/blocks/card";
// constants

type Props = {
  stateDistribution: IUserStateDistribution[];
};

export function ProfileWorkload({ stateDistribution }: Props) {
  const { t } = useTranslation();

  return (
    <div className="@container space-y-2">
      <h3 className="text-h6-medium">{t("profile.stats.workload")}</h3>
      <div className="grid grid-cols-2 gap-3 @sm:grid-cols-3 @[40rem]:grid-cols-5">
        {stateDistribution.map((group) => (
          <Card
            key={group.state_group}
            direction="column"
            spacing="sm"
            variant="without-shadow"
            className="min-w-0 rounded-xl border border-subtle-1 bg-layer-2 p-3"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <div
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-xs"
                  style={{
                    backgroundColor: STATE_GROUPS[group.state_group].color,
                  }}
                />
                <span className="truncate text-body-xs-regular text-placeholder">
                  {group.state_group === "unstarted"
                    ? "Not started"
                    : group.state_group === "started"
                      ? "Working on"
                      : STATE_GROUPS[group.state_group].label}
                </span>
              </div>
              <p className="text-h5-semibold">{group.state_count}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
