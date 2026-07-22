/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { NodeSelection } from "@tiptap/pm/state";
import React, { useCallback } from "react";
// plane imports
import { cn } from "@plane/utils";
// local imports
import { ECustomVideoAttributeNames } from "../types";
import type { CustomVideoNodeViewProps } from "./node-view";

type CustomVideoBlockProps = CustomVideoNodeViewProps & {
  src: string | undefined;
  videoFromFileSystem: string | undefined;
  setFailedToLoadVideo: (isError: boolean) => void;
};

export function CustomVideoBlock(props: CustomVideoBlockProps) {
  const { editor, getPos, node, selected, setFailedToLoadVideo, src: resolvedVideoSrc, videoFromFileSystem } = props;

  // show the preview video from the file system if the remote video's src is not resolved yet
  const displayedVideoSrc = resolvedVideoSrc || videoFromFileSystem;

  const handleVideoMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const pos = getPos();
      if (pos === undefined) return;
      const nodeSelection = NodeSelection.create(editor.state.doc, pos);
      editor.view.dispatch(editor.state.tr.setSelection(nodeSelection));
    },
    [editor, getPos]
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      id={node.attrs[ECustomVideoAttributeNames.ID] ?? undefined}
      className="w-fit max-w-full"
      onMouseDown={handleVideoMouseDown}
    >
      <div className="group/video-component relative inline-block max-w-full">
        <video
          src={displayedVideoSrc}
          controls
          preload="metadata"
          className={cn("block max-w-full rounded-md", {
            "read-only-video": !editor.isEditable,
          })}
          style={{ maxHeight: "480px" }}
          onError={() => setFailedToLoadVideo(true)}
        >
          {/* user-uploaded videos have no caption tracks */}
          <track kind="captions" />
        </video>
        {selected && displayedVideoSrc === resolvedVideoSrc && (
          <div className="pointer-events-none absolute inset-0 size-full rounded-md bg-accent-primary/30" />
        )}
      </div>
    </div>
  );
}
