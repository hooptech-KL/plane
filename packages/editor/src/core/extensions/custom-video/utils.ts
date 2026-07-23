/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
// local imports
import { ECustomVideoAttributeNames, ECustomVideoStatus } from "./types";
import type { Pixel, TCustomVideoAlignment, TCustomVideoAttributes } from "./types";

export const DEFAULT_CUSTOM_VIDEO_ATTRIBUTES: TCustomVideoAttributes = {
  [ECustomVideoAttributeNames.SOURCE]: null,
  [ECustomVideoAttributeNames.ID]: null,
  [ECustomVideoAttributeNames.WIDTH]: "40%",
  [ECustomVideoAttributeNames.HEIGHT]: "auto",
  [ECustomVideoAttributeNames.ASPECT_RATIO]: null,
  [ECustomVideoAttributeNames.ALIGNMENT]: "left",
  [ECustomVideoAttributeNames.STATUS]: ECustomVideoStatus.PENDING,
};

export const getVideoComponentFileMap = (editor: Editor) => editor.storage.videoComponent?.fileMap;

export const ensurePixelString = <TDefault>(
  value: Pixel | TDefault | number | undefined | null,
  defaultValue?: TDefault
) => {
  if (!value || value === defaultValue) {
    return defaultValue;
  }

  if (typeof value === "number") {
    return `${value}px` satisfies Pixel;
  }

  return value;
};

export const VIDEO_ALIGNMENT_OPTIONS: {
  label: string;
  value: TCustomVideoAlignment;
  icon: LucideIcon;
}[] = [
  {
    label: "Left",
    value: "left",
    icon: AlignLeft,
  },
  {
    label: "Center",
    value: "center",
    icon: AlignCenter,
  },
  {
    label: "Right",
    value: "right",
    icon: AlignRight,
  },
];

export const getVideoBlockId = (id: string) => `editor-video-block-${id}`;

export const ACCEPTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];
