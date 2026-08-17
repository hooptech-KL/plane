/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceNotifications } from "@/hooks/store/notifications";

const POLL_INTERVAL = 30000;

const showNotification = (body: string) => {
  const notification = new Notification("Plane", { body });
  notification.addEventListener("click", () => window.focus());
};

const useBrowserNotifications = () => {
  const { workspaceSlug } = useParams();
  const { unreadNotificationsCount, getUnreadNotificationsCount } = useWorkspaceNotifications();
  const previousCount = useRef(unreadNotificationsCount.total_unread_notifications_count);

  useEffect(() => {
    if (!workspaceSlug) return;

    const interval = setInterval(() => getUnreadNotificationsCount(workspaceSlug.toString()), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [workspaceSlug, getUnreadNotificationsCount]);

  useEffect(() => {
    const count = unreadNotificationsCount.total_unread_notifications_count;

    const notify = async () => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (count <= previousCount.current || !document.hidden) return;

      const body = count === 1 ? "You have 1 unread notification" : `You have ${count} unread notifications`;

      if (Notification.permission === "granted") {
        showNotification(body);
      } else if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") showNotification(body);
      }
    };

    notify();
    previousCount.current = count;
  }, [unreadNotificationsCount.total_unread_notifications_count]);
};

export default useBrowserNotifications;
