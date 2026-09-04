import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './notification.api';
import * as mock from './notification.api.mock';

const impl = USE_MOCKS ? mock : real;

export const getNotifications = impl.getNotifications;
export const getNotificationStats = impl.getNotificationStats;
export const getUnreadCount = impl.getUnreadCount;
export const getRecentNotifications = impl.getRecentNotifications;
export const markNotificationRead = impl.markNotificationRead;
export const markAllNotificationsRead = impl.markAllNotificationsRead;
export const getNotificationPreferences = impl.getNotificationPreferences;
export const setNotificationPreference = impl.setNotificationPreference;
