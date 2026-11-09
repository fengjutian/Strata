/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IconGlyph } from "@makestrata/propel/components/icon";
// strata imports
import type { TLogoProps } from "@strata/types";
import { FavoriteFolderIcon } from "@strata/blocks/icons";
import { CyclesOutline, ModuleOutline, PagesOutline, ProjectsOutline, ViewsOutline } from "@makestrata/propel/icons";
import type { ISvgIcons } from "@strata/blocks/icons";
import { Logo } from "@strata/blocks/emoji-icon-picker";

const ICON_MAP: Record<string, React.FC<ISvgIcons> | IconGlyph> = {
  page: PagesOutline,
  project: ProjectsOutline,
  view: ViewsOutline,
  module: ModuleOutline,
  cycle: CyclesOutline,
  folder: FavoriteFolderIcon,
};

type Props = {
  type: string;
  logo?: TLogoProps;
};

export const FavoriteItemIcon = ({ type, logo }: Props) => {
  const Icon = ICON_MAP[type] ?? PagesOutline;

  return (
    <>
      <div className="hidden size-5 items-center justify-center group-hover:flex">
        <Icon className="m-auto size-4 flex-shrink-0 stroke-[1.5]" />
      </div>
      <div className="flex size-5 items-center justify-center group-hover:hidden">
        {logo?.in_use ? (
          <Logo logo={logo} size={16} type={type === "project" ? "material" : "lucide"} />
        ) : (
          <Icon className="m-auto size-4 flex-shrink-0 stroke-[1.5]" />
        )}
      </div>
    </>
  );
};
