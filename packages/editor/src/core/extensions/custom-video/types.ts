/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Node } from "@tiptap/core";
// types
import type { TFileHandler } from "@/types";

export enum ECustomVideoAttributeNames {
  ID = "id",
  WIDTH = "width",
  HEIGHT = "height",
  ASPECT_RATIO = "aspectRatio",
  SOURCE = "src",
  ALIGNMENT = "alignment",
  STATUS = "status",
}

export type Pixel = `${number}px`;

export type PixelAttribute<TDefault> = Pixel | TDefault;

export type TCustomVideoSize = {
  width: PixelAttribute<"40%">;
  height: PixelAttribute<"auto">;
  aspectRatio: number | null;
};

export type TCustomVideoAlignment = "left" | "center" | "right";

export enum ECustomVideoStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  UPLOADED = "uploaded",
}

export type TCustomVideoAttributes = {
  [ECustomVideoAttributeNames.ID]: string | null;
  [ECustomVideoAttributeNames.WIDTH]: PixelAttribute<"40%" | number> | null;
  [ECustomVideoAttributeNames.HEIGHT]: PixelAttribute<"auto" | number> | null;
  [ECustomVideoAttributeNames.ASPECT_RATIO]: number | null;
  [ECustomVideoAttributeNames.SOURCE]: string | null;
  [ECustomVideoAttributeNames.ALIGNMENT]: TCustomVideoAlignment;
  [ECustomVideoAttributeNames.STATUS]: ECustomVideoStatus;
};

export type UploadEntity = ({ event: "insert" } | { event: "drop"; file: File }) & { hasOpenedFileInputOnce?: boolean };

export type InsertVideoComponentProps = {
  file?: File;
  pos?: number;
  event: "insert" | "drop";
};

export type CustomVideoExtensionOptions = {
  getVideoDownloadSource: TFileHandler["getAssetDownloadSrc"];
  getVideoSource: TFileHandler["getAssetSrc"];
  restoreVideo: TFileHandler["restore"];
  uploadVideo?: TFileHandler["upload"];
};

export type CustomVideoExtensionStorage = {
  fileMap: Map<string, UploadEntity>;
  maxFileSize: number;
};

export type CustomVideoExtensionType = Node<CustomVideoExtensionOptions, CustomVideoExtensionStorage>;
