import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { notificationKeys } from '../api/notification.keys';
import {
  getNotificationPreferences,
  getNotificationStats,
  getNotifications,
  getRecentNotifications,
  getUnreadCount,
} from '../api';
import { RECENT_LIMIT } from '../api/notification.types';
import type { NotificationListParams } from '../api/notification.types';

/** How often the badge re-checks when the live stream is not connected. */
export const UNREAD_POLL_MS = 30_000;

export function useNotificationsQuery(params: NotificationListParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => getNotifications(params),
    placeholderData: keepPreviousData,
  });
}

/** KPI counters across everything the signed-in admin may see. */
export function useNotificationStats() {
  return useQuery({
    queryKey: notificationKeys.stats(),
    queryFn: () => getNotificationStats(),
  });
}

/**
 * The bell badge. Polls only while the SSE stream is down — when the stream is
 * connected the server pushes, so a timer would be pure waste.
 */
export function useUnreadCountQuery(isLive: boolean) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => getUnreadCount(),
    refetchInterval: isLive ? false : UNREAD_POLL_MS,
    // The badge must be right after a background tab comes back, and this is the
    // one query cheap enough to justify overriding the global `false`.
    refetchOnWindowFocus: true,
  });
}

/**
 * The bell popover's short list. Disabled until the popover opens so a closed
 * bell costs exactly one unread-count request.
 */
export function useRecentNotificationsQuery(enabled: boolean, limit: number = RECENT_LIMIT) {
  return useQuery({
    queryKey: notificationKeys.recent(limit),
    queryFn: () => getRecentNotifications(limit),
    enabled,
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => getNotificationPreferences(),
  });
}
