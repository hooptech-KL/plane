/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
// local imports
import type { CustomVideoExtensionType, TCustomVideoAttributes } from "../types";
import { ECustomVideoAttributeNames } from "../types";
import { CustomVideoBlock } from "./block";
import { CustomVideoUploader } from "./uploader";

export type CustomVideoNodeViewProps = Omit<NodeViewProps, "extension" | "updateAttributes"> & {
  extension: CustomVideoExtensionType;
  node: NodeViewProps["node"] & {
    attrs: TCustomVideoAttributes;
  };
  updateAttributes: (attrs: Partial<TCustomVideoAttributes>) => void;
};

export function CustomVideoNodeView(props: CustomVideoNodeViewProps) {
  const { editor, extension, node } = props;
  const { src: videoNodeSrc } = node.attrs;

  const [isUploaded, setIsUploaded] = useState(!!videoNodeSrc);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const [resolvedDownloadSrc, setResolvedDownloadSrc] = useState<string | undefined>(undefined);
  const [videoFromFileSystem, setVideoFromFileSystem] = useState<string | undefined>(undefined);
  const [failedToLoadVideo, setFailedToLoadVideo] = useState(false);

  const [editorContainer, setEditorContainer] = useState<HTMLDivElement | null>(null);
  const videoComponentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closestEditorContainer = videoComponentRef.current?.closest(".editor-container");
    if (closestEditorContainer) {
      setEditorContainer(closestEditorContainer as HTMLDivElement);
    }
  }, []);

  // the video is already uploaded if the video-component node has a src attribute
  // and we need to drop the blob preview from our file system
  useEffect(() => {
    if (resolvedSrc || videoNodeSrc) {
      setIsUploaded(true);
      setVideoFromFileSystem(undefined);
    } else {
      setIsUploaded(false);
    }
  }, [resolvedSrc, videoNodeSrc]);

  useEffect(() => {
    if (!videoNodeSrc) {
      setResolvedSrc(undefined);
      setResolvedDownloadSrc(undefined);
      return;
    }

    setResolvedSrc(undefined);
    setResolvedDownloadSrc(undefined);
    // reset the failed state whenever the source changes
    setFailedToLoadVideo(false);

    const getVideoSource = async () => {
      try {
        const url = await extension.options.getVideoSource?.(videoNodeSrc);
        setResolvedSrc(url);
        const downloadUrl = await extension.options.getVideoDownloadSource?.(videoNodeSrc);
        setResolvedDownloadSrc(downloadUrl);
      } catch (error) {
        console.error("Error fetching video source:", error);
        setFailedToLoadVideo(true);
      }
    };
    void getVideoSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoNodeSrc, extension.options.getVideoSource, extension.options.getVideoDownloadSource]);

  const maxFileSize = (editor.storage.videoComponent as { maxFileSize?: number } | undefined)?.maxFileSize ?? 0;
  const hasValidVideoSource = videoFromFileSystem || (isUploaded && resolvedSrc);
  const shouldShowBlock = hasValidVideoSource && !failedToLoadVideo;

  return (
    <NodeViewWrapper key={node.attrs[ECustomVideoAttributeNames.ID]}>
      <div className="mx-0 my-2 p-0" data-drag-handle ref={videoComponentRef}>
        {shouldShowBlock ? (
          <CustomVideoBlock
            editorContainer={editorContainer}
            src={resolvedSrc}
            downloadSrc={resolvedDownloadSrc}
            videoFromFileSystem={videoFromFileSystem}
            setEditorContainer={setEditorContainer}
            setFailedToLoadVideo={setFailedToLoadVideo}
            {...props}
          />
        ) : (
          <CustomVideoUploader
            failedToLoadVideo={failedToLoadVideo}
            loadVideoFromFileSystem={setVideoFromFileSystem}
            maxFileSize={maxFileSize}
            resolvedSrc={resolvedSrc}
            setIsUploaded={setIsUploaded}
            {...props}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
