/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TNotification } from "@plane/types";
import { generateWorkItemLink } from "@plane/utils";
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
  const router = useRouter();
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
    const arrived = totalUnread - previousCount.current;
    debug("count changed", { count: totalUnread, previous: previousCount.current, arrived });
    previousCount.current = totalUnread;

    if (arrived <= 0 || !workspaceSlug) return;

    const announce = async () => {
      const slug = workspaceSlug.toString();
      let latest: TNotification | undefined;

      try {
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
      const issue = latest?.data?.issue;
      const workItemLink =
        issue?.identifier && issue?.sequence_id
          ? generateWorkItemLink({
              workspaceSlug: slug,
              projectId: latest?.project,
              issueId: issue.id,
              projectIdentifier: issue.identifier,
              sequenceId: issue.sequence_id,
            })
          : undefined;

      const opensWorkItem = arrived === 1 && !!workItemLink;
      const target = opensWorkItem ? workItemLink : `/${slug}/notifications`;
      debug("announcing", heading, detail, "->", target);

      setToast({
        type: TOAST_TYPE.INFO,
        title: heading,
        message: detail,
        actionItems: (
          <button
            type="button"
            onClick={() => router.push(target)}
            className="-ml-2 rounded-sm px-2 py-1 text-11 font-medium text-accent-primary hover:bg-surface-2"
          >
            {opensWorkItem ? "View work item" : "View notifications"}
          </button>
        ),
      });

      if (isSupported() && Notification.permission === "granted") {
        try {
          const notification = new Notification(heading, { body: detail });
          notification.addEventListener("click", () => {
            window.focus();
            router.push(target);
            notification.close();
          });
        } catch (error) {
          debug("notification threw", error);
        }
      }
    };

    void announce();
  }, [totalUnread, workspaceSlug, router]);
};

export default useBrowserNotifications;
