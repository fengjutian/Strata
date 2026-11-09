/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import useSWR from "swr";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
import { Skeleton } from "@strata/blocks/skeleton";
// hooks
import { useInstance } from "@/hooks/store";
// types
import type { Route } from "./+types/page";
// local
import { InstanceImageConfigForm } from "./form";
import { tr } from "@/lib/admin-i18n";

const InstanceImagePage = observer(function InstanceImagePage(_props: Route.ComponentProps) {
  // store
  const { formattedConfig, fetchInstanceConfigurations } = useInstance();

  useSWR("INSTANCE_CONFIGURATIONS", () => fetchInstanceConfigurations());

  return (
    <PageWrapper
      header={{
        title: tr("Third-party image libraries"),
        description: tr("Let your users search and choose images from third-party libraries"),
      }}
    >
      {formattedConfig ? (
        <InstanceImageConfigForm config={formattedConfig} />
      ) : (
        <Skeleton className="space-y-8">
          <Skeleton.Item height="50px" width="50%" />
          <Skeleton.Item height="50px" width="20%" />
        </Skeleton>
      )}
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: tr("Images Settings - God Mode") }];

export default InstanceImagePage;
