/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Avatar, Style } from "@dicebear/core";
import botttsDefinition from "@dicebear/styles/bottts.json";
import identiconDefinition from "@dicebear/styles/identicon.json";
import initialsDefinition from "@dicebear/styles/initials.json";
import loreleiDefinition from "@dicebear/styles/lorelei.json";
import pixelArtDefinition from "@dicebear/styles/pixel-art.json";
import shapesDefinition from "@dicebear/styles/shapes.json";

export const DICEBEAR_AVATAR_STYLES = [
  { key: "lorelei", label: "Lorelei", style: new Style(loreleiDefinition) },
  { key: "bottts", label: "Robots", style: new Style(botttsDefinition) },
  { key: "pixel-art", label: "Pixel art", style: new Style(pixelArtDefinition) },
  { key: "initials", label: "Initials", style: new Style(initialsDefinition) },
  { key: "identicon", label: "Identicon", style: new Style(identiconDefinition) },
  { key: "shapes", label: "Shapes", style: new Style(shapesDefinition) },
] as const;

export type TDiceBearAvatarStyle = (typeof DICEBEAR_AVATAR_STYLES)[number]["key"];

export const createDiceBearAvatarDataUri = (styleKey: TDiceBearAvatarStyle, seed: string): string => {
  const selectedStyle = DICEBEAR_AVATAR_STYLES.find(({ key }) => key === styleKey) ?? DICEBEAR_AVATAR_STYLES[0];
  return new Avatar(selectedStyle.style, {
    seed: seed.trim() || "workspace",
    size: 512,
  }).toDataUri();
};

export const convertAvatarDataUriToPng = (dataUri: string, fileName: string): Promise<File> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Could not prepare the avatar image."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not generate the avatar image."));
            return;
          }
          resolve(new File([blob], `${fileName || "workspace"}-avatar.png`, { type: "image/png" }));
        },
        "image/png",
        0.92
      );
    });
    image.addEventListener("error", () => reject(new Error("Could not load the generated avatar.")));
    image.src = dataUri;
  });
