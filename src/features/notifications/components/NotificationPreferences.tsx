import { useTranslation } from 'react-i18next';
import { Alert, Card, Spinner, Switch } from '@ui';
import { useNotificationPreferencesQuery } from '../hooks/useNotificationsQuery';
import { useSetNotificationPreference } from '../hooks/useNotificationMutations';
import { NotificationCategoryBadge } from './NotificationBadges';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  isChannelDisableable,
  resolvePreference,
} from '../api/notification.types';
import styles from './notificationPreferences.module.css';

/**
 * The admin's own delivery settings: one switch per (category × channel).
 *
 * Backed by real endpoints — `GET`/`PUT /notifications/preferences` — which
 * upsert on (user, category, channel). The absence of a row means "use the
 * channel's default", so this renders the RESOLVED state rather than only what
 * has been explicitly saved.
 *
 * `inapp` and `realtime` are shown but locked on: the server declares them
 * `disableable: false` because the notification row IS the in-app delivery and
 * realtime is just its live view. Hiding them would leave the admin guessing
 * where a notification actually goes; showing them disabled states it.
 */
export function NotificationPreferences() {
  const { t } = useTranslation();
  const { data: preferences, isLoading, isError } = useNotificationPreferencesQuery();
  const setPreference = useSetNotificationPreference();

  if (isLoading) {
    return (
      <Card className={styles.center}>
        <Spinner />
      </Card>
    );
  }

  if (isError) {
    return <Alert variant="error">{t('notification.prefs.loadError')}</Alert>;
  }

  const rows = preferences ?? [];

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>{t('notification.prefs.intro')}</p>

      <div className={styles.grid}>
        {NOTIFICATION_CATEGORIES.map((category) => (
          <Card key={category} className={styles.card}>
            <header className={styles.cardHeader}>
              <NotificationCategoryBadge category={category} />
              <span className={styles.cardHint}>{t(`notification.prefs.hint.${category}`)}</span>
            </header>

            <div className={styles.switches}>
              {NOTIFICATION_CHANNELS.map((channel) => {
                const enabled = resolvePreference(rows, category, channel);
                const locked = !isChannelDisableable(channel);
                return (
                  <Switch
                    key={channel}
                    label={t(`notification.channel.${channel}`)}
                    description={
                      locked
                        ? t('notification.prefs.alwaysOn')
                        : t(`notification.channel.${channel}Hint`)
                    }
                    checked={enabled}
                    // Only the locked channels are disabled. The mutation is
                    // optimistic, so an in-flight write neither needs nor wants
                    // to take the control away from whoever just used it.
                    disabled={locked}
                    onChange={(next) =>
                      setPreference.mutate({ category, channel, enabled: next })
                    }
                    testId={`notification-pref-${category}-${channel}`}
                  />
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
