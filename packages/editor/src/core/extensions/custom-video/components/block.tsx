/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { NodeSelection } from "@tiptap/pm/state";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
// plane imports
import { cn } from "@plane/utils";
// local imports
import { ECustomVideoAttributeNames } from "../types";
import type { Pixel, TCustomVideoAttributes, TCustomVideoSize } from "../types";
import { ensurePixelString, getVideoBlockId } from "../utils";
import type { CustomVideoNodeViewProps } from "./node-view";
import { VideoToolbarRoot } from "./toolbar";

const MIN_SIZE = 100;

type CustomVideoBlockProps = CustomVideoNodeViewProps & {
  editorContainer: HTMLDivElement | null;
  videoFromFileSystem: string | undefined;
  setEditorContainer: (editorContainer: HTMLDivElement | null) => void;
  setFailedToLoadVideo: (isError: boolean) => void;
  src: string | undefined;
  downloadSrc: string | undefined;
};

export function CustomVideoBlock(props: CustomVideoBlockProps) {
  // props
  const {
    editor,
    editorContainer,
    extension,
    getPos,
    node,
    selected,
    setEditorContainer,
    setFailedToLoadVideo,
    src: resolvedVideoSrc,
    downloadSrc: resolvedDownloadSrc,
    updateAttributes,
    videoFromFileSystem,
  } = props;
  const {
    width: nodeWidth,
    height: nodeHeight,
    aspectRatio: nodeAspectRatio,
    src: videoNodeSrc,
    alignment: nodeAlignment,
  } = node.attrs;
  // states
  const [size, setSize] = useState<TCustomVideoSize>({
    width: ensurePixelString(nodeWidth, "40%") ?? "40%",
    height: ensurePixelString(nodeHeight, "auto") ?? "auto",
    aspectRatio: nodeAspectRatio || null,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [initialResizeComplete, setInitialResizeComplete] = useState(false);
  const [hasTriedRestoringVideoOnce, setHasTriedRestoringVideoOnce] = useState(false);
  // refs
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRect = useRef<DOMRect | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // extension options
  const isTouchDevice = !!(editor.storage.utility as { isTouchDevice?: boolean } | undefined)?.isTouchDevice;

  const updateAttributesSafely = useCallback(
    (attributes: Partial<TCustomVideoAttributes>, errorMessage: string) => {
      try {
        updateAttributes(attributes);
      } catch (error) {
        console.error(`${errorMessage}:`, error);
      }
    },
    [updateAttributes]
  );

  const handleVideoLoad = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    let closestEditorContainer: HTMLDivElement | null = null;

    if (editorContainer) {
      closestEditorContainer = editorContainer;
    } else {
      closestEditorContainer = video.closest(".editor-container");
      if (!closestEditorContainer) {
        console.error("Editor container not found");
        return;
      }
    }
    if (!closestEditorContainer) {
      console.error("Editor container not found");
      return;
    }

    setEditorContainer(closestEditorContainer);
    // derive the aspect ratio from the video's intrinsic dimensions
    const aspectRatioCalculated =
      video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;

    if (nodeWidth === "40%") {
      const editorWidth = closestEditorContainer.clientWidth;
      const initialWidth = Math.max(editorWidth * 0.4, MIN_SIZE);
      const initialHeight = initialWidth / aspectRatioCalculated;

      const initialComputedSize: TCustomVideoSize = {
        width: `${Math.round(initialWidth)}px` satisfies Pixel,
        height: `${Math.round(initialHeight)}px` satisfies Pixel,
        aspectRatio: aspectRatioCalculated,
      };
      setSize(initialComputedSize);
      updateAttributesSafely(
        initialComputedSize,
        "Failed to update attributes while initializing a video for the first time:"
      );
    } else if (!nodeAspectRatio || nodeAspectRatio !== aspectRatioCalculated) {
      // if the aspect ratio isn't stored (or is stale), update the attrs
      setSize((prevSize) => {
        const newSize = { ...prevSize, aspectRatio: aspectRatioCalculated };
        updateAttributesSafely(
          newSize,
          "Failed to update attributes while initializing videos with width but no aspect ratio:"
        );
        return newSize;
      });
    }
    setInitialResizeComplete(true);
  }, [nodeWidth, updateAttributesSafely, editorContainer, nodeAspectRatio, setEditorContainer]);

  // for real time resizing
  useLayoutEffect(() => {
    setSize((prevSize) => ({
      ...prevSize,
      width: ensurePixelString(nodeWidth) ?? "40%",
      height: ensurePixelString(nodeHeight) ?? "auto",
      aspectRatio: nodeAspectRatio,
    }));
  }, [nodeWidth, nodeHeight, nodeAspectRatio]);

  const handleResize = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current || !containerRect.current || !size.aspectRatio) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

      if (nodeAlignment === "right") {
        const newWidth = Math.max(containerRect.current.right - clientX, MIN_SIZE);
        const newHeight = newWidth / size.aspectRatio;
        setSize((prevSize) => ({ ...prevSize, width: `${newWidth}px`, height: `${newHeight}px` }));
      } else {
        const newWidth = Math.max(clientX - containerRect.current.left, MIN_SIZE);
        const newHeight = newWidth / size.aspectRatio;
        setSize((prevSize) => ({ ...prevSize, width: `${newWidth}px`, height: `${newHeight}px` }));
      }
    },
    [nodeAlignment, size.aspectRatio]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    updateAttributesSafely(size, "Failed to update attributes at the end of resizing:");
  }, [size, updateAttributesSafely]);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    if (containerRef.current) {
      containerRect.current = containerRef.current.getBoundingClientRect();
    }
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResize);
      window.addEventListener("mouseup", handleResizeEnd);
      window.addEventListener("mouseleave", handleResizeEnd);
      window.addEventListener("touchmove", handleResize);
      window.addEventListener("touchend", handleResizeEnd);

      return () => {
        window.removeEventListener("mousemove", handleResize);
        window.removeEventListener("mouseup", handleResizeEnd);
        window.removeEventListener("mouseleave", handleResizeEnd);
        window.removeEventListener("touchmove", handleResize);
        window.removeEventListener("touchend", handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  // select the node when the padding/border area (drag handle) is clicked, while
  // leaving the native video controls free to receive their own pointer events
  const handleWrapperMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isTouchDevice) return;
      const pos = getPos();
      if (pos === undefined) return;
      const nodeSelection = NodeSelection.create(editor.state.doc, pos);
      editor.view.dispatch(editor.state.tr.setSelection(nodeSelection));
      e.stopPropagation();
    },
    [editor, getPos, isTouchDevice]
  );

  const handleVideoError = useCallback(() => {
    void (async () => {
      if (!extension.options.restoreVideo || hasTriedRestoringVideoOnce || !videoNodeSrc) {
        setFailedToLoadVideo(true);
        return;
      }
      try {
        await extension.options.restoreVideo(videoNodeSrc);
        if (videoRef.current && resolvedVideoSrc) {
          videoRef.current.src = resolvedVideoSrc;
        }
      } catch (error) {
        setFailedToLoadVideo(true);
        console.error("Error while loading video", error);
      } finally {
        setHasTriedRestoringVideoOnce(true);
      }
    })();
  }, [extension.options, hasTriedRestoringVideoOnce, resolvedVideoSrc, setFailedToLoadVideo, videoNodeSrc]);

  // show the loader while the remote video's src or preview from filesystem is not set yet (or)
  // if the initial resize (from 40% width and "auto" height attrs to the actual size in px) is not complete
  const showVideoLoader = !resolvedVideoSrc || !initialResizeComplete;
  // show the video toolbar only once the remote video's (post upload) src is set and the initial resize is complete
  const showVideoToolbar = resolvedVideoSrc && resolvedDownloadSrc && initialResizeComplete;
  // show the video resizer only if the editor is editable, the remote video's (post upload) src is set and the initial resize is complete
  const showVideoResizer = editor.isEditable && resolvedVideoSrc && initialResizeComplete;
  // show the preview from the file system if the remote video's src is not resolved yet
  const displayedVideoSrc = resolvedVideoSrc || videoFromFileSystem;

  return (
    <div
      id={
        node.attrs[ECustomVideoAttributeNames.ID]
          ? getVideoBlockId(node.attrs[ECustomVideoAttributeNames.ID])
          : undefined
      }
      className={cn("w-fit max-w-full transition-all", {
        "ml-[50%] -translate-x-1/2": nodeAlignment === "center",
        "ml-[100%] -translate-x-full": nodeAlignment === "right",
      })}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        ref={containerRef}
        className="group/video-component relative inline-block max-w-full"
        onMouseDown={handleWrapperMouseDown}
        style={{
          width: size.width,
          ...(size.aspectRatio && { aspectRatio: size.aspectRatio }),
        }}
      >
        {showVideoLoader && (
          <div className="animate-pulse rounded-md bg-layer-1" style={{ width: size.width, height: size.height }} />
        )}
        {/* user-uploaded videos have no caption tracks */}
        {/* stopPropagation keeps native play/seek/volume interactions from triggering node select/drag */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={displayedVideoSrc}
          controls
          preload="metadata"
          playsInline
          draggable={false}
          onLoadedMetadata={handleVideoLoad}
          onError={handleVideoError}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn("video-component block max-w-full rounded-md", {
            hidden: showVideoLoader,
            "read-only-video": !editor.isEditable,
            "opacity-80 blur-sm": !resolvedVideoSrc,
          })}
          style={{
            width: size.width,
            ...(size.aspectRatio && { aspectRatio: size.aspectRatio }),
            maxHeight: "480px",
          }}
        />
        {showVideoToolbar && (
          <VideoToolbarRoot
            alignment={nodeAlignment ?? "left"}
            editor={editor}
            downloadSrc={resolvedDownloadSrc}
            handleAlignmentChange={(alignment) =>
              updateAttributesSafely({ alignment }, "Failed to update attributes while changing alignment:")
            }
            isTouchDevice={isTouchDevice}
            src={resolvedVideoSrc}
          />
        )}
        {selected && displayedVideoSrc === resolvedVideoSrc && (
          <div className="pointer-events-none absolute inset-0 size-full rounded-md bg-accent-primary/30" />
        )}
        {showVideoResizer && (
          <>
            <div
              className={cn(
                "pointer-events-none absolute inset-0 rounded-md border-2 border-accent-strong transition-opacity duration-100 ease-in-out",
                {
                  "opacity-100": isResizing,
                  "opacity-0 group-hover/video-component:opacity-100": !isResizing,
                }
              )}
            />
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
              className={cn(
                "absolute bottom-0 size-4 translate-y-1/2 rounded-full border-2 border-white bg-accent-primary transition-opacity duration-100 ease-in-out",
                {
                  "pointer-events-auto opacity-100": isResizing,
                  "pointer-events-none opacity-0 group-hover/video-component:pointer-events-auto group-hover/video-component:opacity-100":
                    !isResizing,
                  "left-0 -translate-x-1/2 cursor-nesw-resize": nodeAlignment === "right",
                  "right-0 translate-x-1/2 cursor-nwse-resize": nodeAlignment !== "right",
                }
              )}
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
            />
          </>
        )}
      </div>
    </div>
  );
}
