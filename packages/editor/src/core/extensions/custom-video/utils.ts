/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
// local imports
import { ECustomVideoAttributeNames, ECustomVideoStatus } from "./types";
import type { TCustomVideoAttributes } from "./types";

export const DEFAULT_CUSTOM_VIDEO_ATTRIBUTES: TCustomVideoAttributes = {
  [ECustomVideoAttributeNames.SOURCE]: null,
  [ECustomVideoAttributeNames.ID]: null,
  [ECustomVideoAttributeNames.WIDTH]: null,
  [ECustomVideoAttributeNames.HEIGHT]: null,
  [ECustomVideoAttributeNames.STATUS]: ECustomVideoStatus.PENDING,
};

export const getVideoComponentFileMap = (editor: Editor) => editor.storage.videoComponent?.fileMap;

export const ACCEPTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];
