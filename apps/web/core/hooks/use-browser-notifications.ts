/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceNotifications } from "@/hooks/store/notifications";

const POLL_INTERVAL = 30000;
const DEBUG_KEY = "plane:notify-debug";

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

const showNotification = (body: string) => {
  try {
    const notification = new Notification("Plane", { body });
    notification.addEventListener("click", () => window.focus());
    debug("notification shown", body);
  } catch (error) {
    debug("notification threw", error);
  }
};

const useBrowserNotifications = () => {
  const { workspaceSlug } = useParams();
  const { unreadNotificationsCount, getUnreadNotificationsCount } = useWorkspaceNotifications();
  const previousCount = useRef(unreadNotificationsCount.total_unread_notifications_count);

  useEffect(() => {
    debug("mounted", {
      workspaceSlug,
      supported: isSupported(),
      permission: isSupported() ? Notification.permission : "n/a",
      initialCount: previousCount.current,
    });
  }, [workspaceSlug]);

  useEffect(() => {
    if (!workspaceSlug) return;

    const poll = () =>
      getUnreadNotificationsCount(workspaceSlug.toString())
        .then((result) => debug("polled", result?.total_unread_notifications_count))
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
    const count = unreadNotificationsCount.total_unread_notifications_count;
    const permission = isSupported() ? Notification.permission : "n/a";

    debug("count changed", { count, previous: previousCount.current, permission });

    if (isSupported() && count > previousCount.current && Notification.permission === "granted") {
      showNotification(count === 1 ? "You have 1 unread notification" : `You have ${count} unread notifications`);
    }

    previousCount.current = count;
  }, [unreadNotificationsCount.total_unread_notifications_count]);
};

export default useBrowserNotifications;
