import type { NotificationListParams } from './notification.types';

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params: NotificationListParams) => [...notificationKeys.lists(), params] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  /** The topbar bell's short list; `limit` is part of the key so it can vary. */
  recent: (limit: number) => [...notificationKeys.all, 'recent', limit] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};
