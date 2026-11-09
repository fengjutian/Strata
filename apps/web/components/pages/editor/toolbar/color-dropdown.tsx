/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { memo } from "react";
import { ChevronDownOutline, DeactivatedOutline } from "@makestrata/propel/icons";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@makestrata/propel/components/popover";
import { ToolbarMenuTriggerButton, ToolbarMenuTriggerLabel } from "@makestrata/propel/components/toolbar";
// strata editor
import { COLORS_LIST } from "@strata/editor";
import type { TEditorCommands } from "@strata/editor";
// helpers
import { cn } from "@strata/utils";

type Props = {
  handleColorSelect: (
    key: Extract<TEditorCommands, "text-color" | "background-color">,
    color: string | undefined
  ) => void;
  isColorActive: (
    key: Extract<TEditorCommands, "text-color" | "background-color">,
    color: string | undefined
  ) => boolean;
};

export const ColorDropdown = memo(function ColorDropdown(props: Props) {
  const { handleColorSelect, isColorActive } = props;

  return (
    <Popover>
      {/* Propel's ToolbarMenuTrigger only wraps a Menu; this is its Popover twin until Propel ships one */}
      <PopoverTrigger render={<ToolbarMenuTriggerButton aria-label="Color" />}>
        <ToolbarMenuTriggerLabel>Color</ToolbarMenuTriggerLabel>
        <span className="inline-flex transition-transform duration-200 group-data-popup-open:rotate-180">
          <Icon icon={ChevronDownOutline} tint="secondary" />
        </span>
      </PopoverTrigger>
      <PopoverContent variant="rich" side="bottom" align="start">
        <div className="space-y-1.5">
          <p className="text-caption-sm-semibold text-tertiary">Text colors</p>
          <div className="flex items-center gap-2">
            {COLORS_LIST.map((color) => (
              <button
                key={color.key}
                type="button"
                aria-label={color.label}
                aria-pressed={isColorActive("text-color", color.key)}
                className={cn(
                  "size-6 shrink-0 rounded-sm border-xs border-subtle transition-opacity hover:opacity-60",
                  isColorActive("text-color", color.key) && "ring-2 ring-strong ring-offset-1"
                )}
                style={{
                  backgroundColor: color.textColor,
                }}
                onClick={() => handleColorSelect("text-color", color.key)}
              />
            ))}
            <IconButton
              variant="secondary"
              size="sm"
              aria-label="Remove text color"
              icon={<Icon icon={DeactivatedOutline} />}
              onClick={() => handleColorSelect("text-color", undefined)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-caption-sm-semibold text-tertiary">Background colors</p>
          <div className="flex items-center gap-2">
            {COLORS_LIST.map((color) => (
              <button
                key={color.key}
                type="button"
                aria-label={color.label}
                aria-pressed={isColorActive("background-color", color.key)}
                className={cn(
                  "size-6 shrink-0 rounded-sm border-xs border-subtle transition-opacity hover:opacity-60",
                  isColorActive("background-color", color.key) && "ring-2 ring-strong ring-offset-1"
                )}
                style={{
                  backgroundColor: color.backgroundColor,
                }}
                onClick={() => handleColorSelect("background-color", color.key)}
              />
            ))}
            <IconButton
              variant="secondary"
              size="sm"
              aria-label="Remove background color"
              icon={<Icon icon={DeactivatedOutline} />}
              onClick={() => handleColorSelect("background-color", undefined)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ColorDropdown.displayName = "ColorDropdown";
