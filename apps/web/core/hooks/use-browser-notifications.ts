/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceNotifications } from "@/hooks/store/notifications";

const POLL_INTERVAL = 30000;

const isSupported = () => typeof window !== "undefined" && "Notification" in window;

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
    if (!isSupported() || Notification.permission !== "default") return;

    const request = () => void Notification.requestPermission();
    window.addEventListener("pointerdown", request, { once: true });
    return () => window.removeEventListener("pointerdown", request);
  }, []);

  useEffect(() => {
    const count = unreadNotificationsCount.total_unread_notifications_count;

    if (isSupported() && count > previousCount.current && Notification.permission === "granted") {
      showNotification(count === 1 ? "You have 1 unread notification" : `You have ${count} unread notifications`);
    }

    previousCount.current = count;
  }, [unreadNotificationsCount.total_unread_notifications_count]);
};

export default useBrowserNotifications;
