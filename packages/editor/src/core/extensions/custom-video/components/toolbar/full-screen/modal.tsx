/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Download } from "lucide-react";
import { useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import { NewTabIcon, CloseIcon } from "@plane/propel/icons";
// plane imports
import { cn } from "@plane/utils";

type Props = {
  downloadSrc: string;
  isFullScreenEnabled: boolean;
  isTouchDevice: boolean;
  src: string;
  toggleFullScreenMode: (val: boolean) => void;
};

function VideoFullScreenModalWithoutPortal(props: Props) {
  const { isFullScreenEnabled, isTouchDevice, downloadSrc, src, toggleFullScreenMode } = props;

  const handleClose = useCallback(() => {
    toggleFullScreenMode(false);
  }, [toggleFullScreenMode]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    },
    [handleClose]
  );

  useEffect(() => {
    if (!isFullScreenEnabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullScreenEnabled, handleKeyDown]);

  if (!isFullScreenEnabled) return null;

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-50 size-full bg-black/90 opacity-0 transition-opacity", {
        "editor-video-full-screen-modal pointer-events-auto opacity-100": isFullScreenEnabled,
      })}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen video viewer"
    >
      <div className="relative grid size-full place-items-center overflow-hidden">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-10 right-10 z-10 grid size-8 place-items-center"
          aria-label="Close video viewer"
        >
          <CloseIcon className="size-8 text-white/60 transition-colors hover:text-white" />
        </button>
        {/* user-uploaded videos have no caption tracks */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={src}
          controls
          autoPlay
          className="rounded-lg"
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
          }}
        />
        <div className="fixed bottom-10 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1 divide-x divide-subtle-1 rounded-md border border-subtle-1 bg-black py-2">
          {!isTouchDevice && (
            <button
              type="button"
              onClick={() => window.open(downloadSrc, "_blank")}
              className="grid size-8 flex-shrink-0 place-items-center text-white/60 transition-colors duration-200 hover:text-white"
              aria-label="Download video"
            >
              <Download className="size-4" />
            </button>
          )}
          {!isTouchDevice && (
            <button
              type="button"
              onClick={() => window.open(src, "_blank")}
              className="grid size-8 flex-shrink-0 place-items-center text-white/60 transition-colors duration-200 hover:text-white"
              aria-label="Open video in new tab"
            >
              <NewTabIcon className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function VideoFullScreenModal(props: Props) {
  let modal = <VideoFullScreenModalWithoutPortal {...props} />;
  const portal = document.querySelector("#editor-portal");
  if (portal) {
    modal = ReactDOM.createPortal(modal, portal);
  } else {
    console.warn("Portal element #editor-portal not found. Rendering in document.body");
    if (typeof document !== "undefined" && document.body) {
      modal = ReactDOM.createPortal(modal, document.body);
    }
  }
  return modal;
}
