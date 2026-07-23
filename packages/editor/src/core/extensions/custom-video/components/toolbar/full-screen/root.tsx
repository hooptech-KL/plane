/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Maximize } from "lucide-react";
import { useEffect, useState } from "react";
// plane imports
import { Tooltip } from "@plane/propel/tooltip";
// local imports
import { VideoFullScreenModal } from "./modal";

type Props = {
  video: {
    downloadSrc: string;
    src: string;
  };
  isTouchDevice: boolean;
  toggleToolbarViewStatus: (val: boolean) => void;
};

export function VideoFullScreenActionRoot(props: Props) {
  const { video, isTouchDevice, toggleToolbarViewStatus } = props;
  // states
  const [isFullScreenEnabled, setIsFullScreenEnabled] = useState(false);
  // derived values
  const { downloadSrc, src } = video;

  useEffect(() => {
    toggleToolbarViewStatus(isFullScreenEnabled);
  }, [isFullScreenEnabled, toggleToolbarViewStatus]);

  return (
    <>
      <VideoFullScreenModal
        downloadSrc={downloadSrc}
        isFullScreenEnabled={isFullScreenEnabled}
        isTouchDevice={isTouchDevice}
        src={src}
        toggleFullScreenMode={setIsFullScreenEnabled}
      />
      <Tooltip tooltipContent="View in full screen" disabled={isTouchDevice}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFullScreenEnabled(true);
          }}
          className="grid h-full flex-shrink-0 place-items-center text-on-color/60 transition-colors hover:text-on-color"
          aria-label="View video in full screen"
        >
          <Maximize className="size-3" />
        </button>
      </Tooltip>
    </>
  );
}
