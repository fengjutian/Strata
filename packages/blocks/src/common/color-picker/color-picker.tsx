/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";
import { useTranslation } from "@strata/i18n";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker(props: ColorPickerProps) {
  const { value, onChange, className = "" } = props;
  // strata hooks
  const { t } = useTranslation();
  // refs
  const inputRef = React.useRef<HTMLInputElement>(null);

  // handlers
  const handleOnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    inputRef.current?.click();
  };

  return (
    <div className="relative flex items-center justify-center">
      <button
        type="button"
        className={`size-4 cursor-pointer rounded-full conical-gradient ${className}`}
        onClick={handleOnClick}
        aria-label={t("aria_labels.color_picker.open")}
      />
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="invisible absolute inset-0 size-4"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
