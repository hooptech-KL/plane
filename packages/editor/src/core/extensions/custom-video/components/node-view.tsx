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
import { ECustomVideoAttributeNames, ECustomVideoStatus } from "../types";
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
  const { src: videoNodeSrc, status } = node.attrs;

  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const [resolvedDownloadSrc, setResolvedDownloadSrc] = useState<string | undefined>(undefined);
  const [failedToLoadVideo, setFailedToLoadVideo] = useState(false);

  const [editorContainer, setEditorContainer] = useState<HTMLDivElement | null>(null);
  const videoComponentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closestEditorContainer = videoComponentRef.current?.closest(".editor-container");
    if (closestEditorContainer) {
      setEditorContainer(closestEditorContainer as HTMLDivElement);
    }
  }, []);

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
  // Only mount the real <video> once the asset is fully uploaded AND its src is
  // resolved. This guarantees the <video onError> handler can never fire (and
  // flash "Error…") while an upload is still in flight.
  const isUploaded = status === ECustomVideoStatus.UPLOADED || !!videoNodeSrc;
  const shouldShowBlock = isUploaded && !!resolvedSrc && !failedToLoadVideo;

  return (
    <NodeViewWrapper key={node.attrs[ECustomVideoAttributeNames.ID]}>
      <div className="mx-0 my-2 p-0" data-drag-handle ref={videoComponentRef}>
        {shouldShowBlock ? (
          <CustomVideoBlock
            editorContainer={editorContainer}
            src={resolvedSrc}
            downloadSrc={resolvedDownloadSrc}
            videoFromFileSystem={undefined}
            setEditorContainer={setEditorContainer}
            setFailedToLoadVideo={setFailedToLoadVideo}
            {...props}
          />
        ) : (
          <CustomVideoUploader failedToLoadVideo={failedToLoadVideo} maxFileSize={maxFileSize} {...props} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
