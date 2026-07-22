/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
// helpers
import { isFileValid } from "@/helpers/file";
import { insertEmptyParagraphAtNodeBoundaries } from "@/helpers/insert-empty-paragraph-at-node-boundary";
// types
import type { TFileHandler } from "@/types";
// local imports
import type { CustomVideoNodeViewProps } from "./components/node-view";
import { CustomVideoNodeView } from "./components/node-view";
import { CustomVideoExtensionConfig } from "./extension-config";
import type { CustomVideoExtensionOptions, CustomVideoExtensionStorage } from "./types";
import { ECustomVideoAttributeNames, ECustomVideoStatus } from "./types";
import { ACCEPTED_VIDEO_MIME_TYPES, getVideoComponentFileMap } from "./utils";

type Props = {
  fileHandler: TFileHandler;
  isEditable: boolean;
};

export function CustomVideoExtension(props: Props) {
  const { fileHandler, isEditable } = props;
  // derived values
  const { getAssetSrc, restore: restoreVideoFn } = fileHandler;

  return CustomVideoExtensionConfig.extend<CustomVideoExtensionOptions, CustomVideoExtensionStorage>({
    selectable: isEditable,
    draggable: isEditable,

    addOptions() {
      const upload = "upload" in fileHandler ? fileHandler.upload : undefined;
      return {
        ...this.parent?.(),
        getVideoSource: getAssetSrc,
        restoreVideo: restoreVideoFn,
        uploadVideo: upload,
      };
    },

    addStorage() {
      const maxFileSize = "validation" in fileHandler ? fileHandler.validation?.maxFileSize : 0;

      return {
        fileMap: new Map(),
        maxFileSize,
        // escape markdown for videos
        markdown: {
          serialize() {},
        },
      };
    },

    addCommands() {
      return {
        insertVideoComponent:
          (insertProps) =>
          ({ commands }) => {
            // Early return if there's an invalid file being dropped
            if (
              insertProps?.file &&
              !isFileValid({
                acceptedMimeTypes: ACCEPTED_VIDEO_MIME_TYPES,
                file: insertProps.file,
                maxFileSize: this.storage.maxFileSize,
                onError: (_error, message) => alert(message),
              })
            ) {
              return false;
            }

            // generate a unique id for the video to keep track of dropped
            // files' file data
            const fileId = uuidv4();

            const videoComponentFileMap = getVideoComponentFileMap(this.editor);

            if (videoComponentFileMap) {
              if (insertProps?.event === "drop" && insertProps.file) {
                videoComponentFileMap.set(fileId, {
                  file: insertProps.file,
                  event: insertProps.event,
                });
              } else if (insertProps.event === "insert") {
                videoComponentFileMap.set(fileId, {
                  event: insertProps.event,
                  hasOpenedFileInputOnce: false,
                });
              }
            }

            const attributes = {
              [ECustomVideoAttributeNames.ID]: fileId,
              [ECustomVideoAttributeNames.STATUS]: ECustomVideoStatus.PENDING,
            };

            if (insertProps.pos) {
              return commands.insertContentAt(insertProps.pos, {
                type: this.name,
                attrs: attributes,
              });
            }
            return commands.insertContent({
              type: this.name,
              attrs: attributes,
            });
          },
      };
    },

    addKeyboardShortcuts() {
      return {
        ArrowDown: insertEmptyParagraphAtNodeBoundaries("down", this.name),
        ArrowUp: insertEmptyParagraphAtNodeBoundaries("up", this.name),
      };
    },
    addNodeView() {
      return ReactNodeViewRenderer((nodeViewProps) => (
        <CustomVideoNodeView {...nodeViewProps} node={nodeViewProps.node as CustomVideoNodeViewProps["node"]} />
      ));
    },
  });
}
