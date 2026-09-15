/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TNotification } from "@plane/types";
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import workspaceNotificationService from "@/services/workspace-notification.service";

const POLL_INTERVAL = 30000;
const DEBUG_KEY = "plane:notify-debug";
const LATEST_PAGE = { per_page: 1, cursor: "1:0:0" };

const isSupported = () => typeof window !== "undefined" && "Notification" in window;

const isDebugEnabled = () => {
  try {
    return typeof window !== "undefined" && !!localStorage.getItem(DEBUG_KEY);
  } catch {
    return false;
  }
};

const debug = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  if (isDebugEnabled()) console.log("[notify]", ...args);
};

const describe = (notification: TNotification | undefined, fallbackCount: number) => {
  if (!notification) {
    return {
      heading: "Plane",
      detail: fallbackCount === 1 ? "You have 1 unread notification" : `You have ${fallbackCount} unread notifications`,
    };
  }

  const issue = notification.data?.issue;
  const reference = issue?.identifier && issue?.sequence_id ? `${issue.identifier}-${issue.sequence_id}` : undefined;
  const isMention =
    notification.is_mentioned_notification || !!notification.sender?.toLowerCase().includes("mentioned");
  const detail = notification.title?.trim() || (isMention ? "mentioned you" : "new activity");

  return {
    heading: [reference, issue?.name].filter(Boolean).join(" ") || "Plane",
    detail,
  };
};

const useBrowserNotifications = () => {
  const { workspaceSlug } = useParams();
  const { unreadNotificationsCount, getUnreadNotificationsCount } = useWorkspaceNotifications();
  const totalUnread =
    unreadNotificationsCount.total_unread_notifications_count +
    unreadNotificationsCount.mention_unread_notifications_count;
  const previousCount = useRef(totalUnread);

  useEffect(() => {
    if (!workspaceSlug) return;

    const poll = () =>
      getUnreadNotificationsCount(workspaceSlug.toString())
        .then((result) =>
          debug(
            "polled",
            result?.total_unread_notifications_count,
            "mentions",
            result?.mention_unread_notifications_count
          )
        )
        .catch((error: unknown) => debug("poll failed", error));

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [workspaceSlug, getUnreadNotificationsCount]);

  useEffect(() => {
    if (!isSupported() || Notification.permission !== "default") return;

    const request = () => void Notification.requestPermission().then((p) => debug("permission now", p));
    window.addEventListener("pointerdown", request, { once: true });
    return () => window.removeEventListener("pointerdown", request);
  }, []);

  useEffect(() => {
    const increased = totalUnread > previousCount.current;
    debug("count changed", { count: totalUnread, previous: previousCount.current, increased });
    previousCount.current = totalUnread;

    if (!increased || !workspaceSlug) return;

    const announce = async () => {
      let latest: TNotification | undefined;
      try {
        const slug = workspaceSlug.toString();
        const [regular, mentions] = await Promise.all([
          workspaceNotificationService.fetchNotifications(slug, { ...LATEST_PAGE, read: false }),
          workspaceNotificationService.fetchNotifications(slug, { ...LATEST_PAGE, read: false, mentioned: true }),
        ]);
        debug("fetched", { regular: regular?.results?.length, mentions: mentions?.results?.length });
        latest = [...(regular?.results ?? []), ...(mentions?.results ?? [])].reduce<TNotification | undefined>(
          (newest, item) => (!newest || (item.created_at ?? "") > (newest.created_at ?? "") ? item : newest),
          undefined
        );
      } catch (error) {
        debug("could not fetch latest notification", error);
      }

      const { heading, detail } = describe(latest, totalUnread);
      debug("announcing", heading, detail);

      setToast({ type: TOAST_TYPE.INFO, title: heading, message: detail });

      if (isSupported() && Notification.permission === "granted") {
        try {
          const notification = new Notification(heading, { body: detail });
          notification.addEventListener("click", () => window.focus());
        } catch (error) {
          debug("notification threw", error);
        }
      }
    };

    void announce();
  }, [totalUnread, workspaceSlug]);
};

export default useBrowserNotifications;
