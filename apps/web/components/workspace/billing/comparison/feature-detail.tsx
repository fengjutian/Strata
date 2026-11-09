/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { DeactivatedOutline, MinusOutline, TickCircleOutline } from "@makestrata/propel/icons";
import type { EProductSubscriptionEnum } from "@strata/types";
// strata imports
// constants
import type { TPlanFeatureData } from "@/components/workspace/billing/comparison/plans";

type TPlanFeatureDetailProps = {
  subscriptionType: EProductSubscriptionEnum;
  data: TPlanFeatureData;
};

export function PlanFeatureDetail(props: TPlanFeatureDetailProps) {
  const { data } = props;

  if (data === null || data === undefined) {
    return <MinusOutline className="size-4 text-placeholder" />;
  }
  if (data === true) {
    return <TickCircleOutline className="size-4 text-accent-primary" />;
  }
  if (data === false) {
    return <DeactivatedOutline className="size-4 text-placeholder" />;
  }
  return <>{data}</>;
}
