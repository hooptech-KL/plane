/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Video } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// plane imports
import { cn } from "@plane/utils";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// helpers
import { EFileError, isFileValid } from "@/helpers/file";
// local imports
import { ECustomVideoStatus } from "../types";
import { ACCEPTED_VIDEO_MIME_TYPES, getVideoComponentFileMap } from "../utils";
import type { CustomVideoNodeViewProps } from "./node-view";

type CustomVideoUploaderProps = CustomVideoNodeViewProps & {
  failedToLoadVideo: boolean;
  loadVideoFromFileSystem: (url: string | undefined) => void;
  maxFileSize: number;
  resolvedSrc: string | undefined;
  setIsUploaded: (isUploaded: boolean) => void;
};

export function CustomVideoUploader(props: CustomVideoUploaderProps) {
  const {
    editor,
    extension,
    failedToLoadVideo,
    getPos,
    loadVideoFromFileSystem,
    maxFileSize,
    node,
    resolvedSrc,
    selected,
    setIsUploaded,
    updateAttributes,
  } = props;
  // refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTriggeredFilePickerRef = useRef(false);
  const hasTriedUploadingOnMountRef = useRef(false);
  const objectUrlRef = useRef<string | undefined>(undefined);
  // states
  const [draggedInside, setDraggedInside] = useState(false);
  const [isVideoBeingUploaded, setIsVideoBeingUploaded] = useState(false);
  // derived values
  const { id: videoEntityId } = node.attrs;
  const videoComponentFileMap = useMemo(() => getVideoComponentFileMap(editor), [editor]);
  const isTouchDevice = !!(editor.storage.utility as { isTouchDevice?: boolean } | undefined)?.isTouchDevice;

  // revoke the blob preview URL once the real (resolved) src is ready
  useEffect(() => {
    if (resolvedSrc && objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = undefined;
    }
  }, [resolvedSrc]);

  // revoke any pending blob preview URL on unmount
  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = undefined;
      }
    },
    []
  );

  const onUploadComplete = useCallback(
    (url: string) => {
      if (!url || !videoEntityId) return;
      setIsUploaded(true);
      // update the node view's src attribute post upload
      updateAttributes({
        src: url,
        status: ECustomVideoStatus.UPLOADED,
      });
      videoComponentFileMap?.delete(videoEntityId);

      const pos = getPos();
      const currentSelection = editor.state.selection;
      const currentNode = editor.state.doc.nodeAt(currentSelection.from);

      // only if the cursor is at the current video component, manipulate the cursor position
      if (currentNode && currentNode.type.name === node.type.name && pos !== undefined) {
        const nextNode = editor.state.doc.nodeAt(pos + 1);
        if (nextNode && nextNode.type.name === CORE_EXTENSIONS.PARAGRAPH) {
          editor.commands.setTextSelection(pos + 1);
        } else {
          editor.commands.createParagraphNear();
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videoComponentFileMap, videoEntityId, updateAttributes, getPos, editor]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      // validate the file before doing anything
      if (
        !isFileValid({
          acceptedMimeTypes: ACCEPTED_VIDEO_MIME_TYPES,
          file,
          maxFileSize,
          onError: (_error: EFileError, message: string) => alert(message),
        })
      ) {
        return;
      }

      try {
        setIsVideoBeingUploaded(true);
        (editor.storage.utility as { uploadInProgress?: boolean }).uploadInProgress = true;
        updateAttributes({ status: ECustomVideoStatus.UPLOADING });

        // build a blob-URL preview (data: URLs are unreliable in <video>)
        const previewUrl = URL.createObjectURL(file);
        objectUrlRef.current = previewUrl;
        loadVideoFromFileSystem(previewUrl);

        const url = await extension.options.uploadVideo?.(videoEntityId ?? "", file);
        if (url) {
          onUploadComplete(url);
        }
      } catch (error) {
        console.error("Error while uploading video:", error);
      } finally {
        setIsVideoBeingUploaded(false);
        (editor.storage.utility as { uploadInProgress?: boolean }).uploadInProgress = false;
      }
    },
    [editor, extension.options, loadVideoFromFileSystem, maxFileSize, onUploadComplete, updateAttributes, videoEntityId]
  );

  // after the video component is mounted, start the upload process based on its
  // stored file-map metadata
  useEffect(() => {
    if (hasTriedUploadingOnMountRef.current) return;

    const meta = videoComponentFileMap?.get(videoEntityId ?? "");
    if (meta) {
      if (meta.event === "drop" && "file" in meta) {
        hasTriedUploadingOnMountRef.current = true;
        void uploadFile(meta.file);
      } else if (meta.event === "insert" && fileInputRef.current && !hasTriggeredFilePickerRef.current) {
        if (meta.hasOpenedFileInputOnce) return;
        if (!isTouchDevice) {
          fileInputRef.current.click();
        }
        hasTriggeredFilePickerRef.current = true;
        videoComponentFileMap?.set(videoEntityId ?? "", { ...meta, hasOpenedFileInputOnce: true });
      }
    } else {
      hasTriedUploadingOnMountRef.current = true;
    }
  }, [videoEntityId, isTouchDevice, uploadFile, videoComponentFileMap]);

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      const file = e.target.files?.[0];
      if (!file) return;
      await uploadFile(file);
    },
    [uploadFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedInside(false);
      if (!editor.isEditable) return;
      const file = e.dataTransfer.files?.[0];
      if (file) {
        void uploadFile(file);
      }
    },
    [editor.isEditable, uploadFile]
  );

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (editor.isEditable) setDraggedInside(true);
    },
    [editor.isEditable]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedInside(false);
  }, []);

  const isErrorState = failedToLoadVideo;

  const borderColor =
    selected && editor.isEditable && !isErrorState
      ? "color-mix(in srgb, var(--border-color-accent-strong) 20%, transparent)"
      : undefined;

  const getDisplayMessage = useCallback(() => {
    if (isErrorState) {
      return "Error loading video";
    }
    if (isVideoBeingUploaded) {
      return "Uploading...";
    }
    if (draggedInside && editor.isEditable) {
      return "Drop video here";
    }
    return "Add a video";
  }, [draggedInside, editor.isEditable, isErrorState, isVideoBeingUploaded]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className={cn(
        "video-upload-component flex cursor-default items-center justify-start gap-2 rounded-lg border border-dashed bg-layer-3 px-2 py-3 text-tertiary transition-all duration-200 ease-in-out",
        {
          "border-subtle": !(selected && editor.isEditable && !isErrorState),
          "cursor-pointer hover:bg-layer-3-hover hover:text-secondary": editor.isEditable && !isErrorState,
          "bg-layer-3-hover text-secondary": draggedInside && editor.isEditable && !isErrorState,
          "bg-accent-primary/10 text-accent-secondary hover:bg-accent-primary/10 hover:text-accent-secondary":
            selected && editor.isEditable && !isErrorState,
          "cursor-default bg-danger-subtle text-danger-primary": isErrorState,
          "hover:bg-danger-subtle-hover hover:text-danger-primary": isErrorState && editor.isEditable,
          "bg-danger-subtle-selected": isErrorState && selected,
        }
      )}
      style={borderColor ? { borderColor } : undefined}
      onDrop={onDrop}
      onDragOver={onDragEnter}
      onDragLeave={onDragLeave}
      contentEditable={false}
      onClick={() => {
        if (!isErrorState && editor.isEditable) {
          fileInputRef.current?.click();
        }
      }}
    >
      <Video className="size-4" />
      <div className="flex-1 text-14 font-medium">{getDisplayMessage()}</div>
      <input
        className="size-0 overflow-hidden"
        ref={fileInputRef}
        hidden
        type="file"
        accept={ACCEPTED_VIDEO_MIME_TYPES.join(",")}
        onChange={onFileChange}
      />
    </div>
  );
}
