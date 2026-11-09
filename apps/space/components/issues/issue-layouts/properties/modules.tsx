/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { ModuleSelect } from "@strata/blocks/property-select";
import type { SelectVariant } from "@strata/blocks/select";
import { useTranslation } from "@strata/i18n";
import { cn } from "@strata/utils";
// helpers
import { READ_ONLY_SELECT_CLASSNAME, toSinglePage } from "@/helpers/select.helper";
// hooks
import { useModule } from "@/hooks/store/use-module";

type Props = {
  moduleIds: string[] | undefined;
  variant?: Exclude<SelectVariant, "breadcrumb">;
  className?: string;
};

/** The work item modules as a read-only `ModuleSelect` chip. */
export const IssueBlockModules = observer(function IssueBlockModules(props: Props) {
  const { moduleIds, variant = "pill-md", className } = props;
  // i18n
  const { t } = useTranslation();
  // store hooks
  const { modules, getModulesByIds } = useModule();
  // derived values
  const selectedModules = getModulesByIds(moduleIds ?? []).map(({ id, name }) => ({ id, name }));

  return (
    <ModuleSelect
      multiple
      getValues={() => toSinglePage(modules?.map(({ id, name }) => ({ id, name })))}
      value={selectedModules}
      onChange={() => {}}
      variant={variant}
      placeholder={t("common.modules")}
      className={cn(READ_ONLY_SELECT_CLASSNAME, className)}
      tooltip={{ heading: t("common.modules"), emptyContent: t("common.none") }}
      disabled
    />
  );
});
