/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
import { useState } from "react";
// plane imports
import { cn } from "@plane/utils";
// local imports
import type { TCustomVideoAlignment } from "../../types";
import { VideoAlignmentAction } from "./alignment";
import { VideoDownloadAction } from "./download";
import { VideoFullScreenActionRoot } from "./full-screen";

type Props = {
  alignment: TCustomVideoAlignment;
  editor: Editor;
  downloadSrc: string;
  handleAlignmentChange: (alignment: TCustomVideoAlignment) => void;
  isTouchDevice: boolean;
  src: string;
};

export function VideoToolbarRoot(props: Props) {
  const { alignment, editor, downloadSrc, handleAlignmentChange, isTouchDevice, src } = props;
  // states
  const [shouldShowToolbar, setShouldShowToolbar] = useState(false);
  // derived values
  const isEditable = editor.isEditable;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1 right-1 z-20 flex h-7 items-center gap-2 rounded-sm bg-black/80 px-2 opacity-0 transition-opacity group-hover/video-component:pointer-events-auto group-hover/video-component:opacity-100",
        {
          "pointer-events-auto opacity-100": shouldShowToolbar,
        }
      )}
    >
      {!isTouchDevice && <VideoDownloadAction src={downloadSrc} />}
      {isEditable && (
        <VideoAlignmentAction
          activeAlignment={alignment}
          handleChange={handleAlignmentChange}
          isTouchDevice={isTouchDevice}
          toggleToolbarViewStatus={setShouldShowToolbar}
        />
      )}
      <VideoFullScreenActionRoot
        video={{ downloadSrc, src }}
        isTouchDevice={isTouchDevice}
        toggleToolbarViewStatus={setShouldShowToolbar}
      />
    </div>
  );
}
