import { useTranslation } from 'react-i18next';
import { Card, Badge, Button, PowerIcon } from '@ui';
import {
  ACCOUNT_TYPE_VARIANT,
  isBookingSuspended,
  isNoShowFlagged,
  type Player,
} from '../api/player.types';
import { useLiftBookingSuspension } from '../hooks/usePlayerModeration';
import styles from './playerCards.module.css';

interface Props {
  player: Player;
}

/** Account & security: membership, email verification, 2FA, and no-show discipline. */
export function PlayerAccountCard({ player }: Props) {
  const { t, i18n } = useTranslation();
  const liftSuspension = useLiftBookingSuspension(player.id);
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const bookingSuspended = isBookingSuspended(player);
  const flagged = isNoShowFlagged(player);

  const suspendedUntil = player.bookingSuspendedUntil
    ? new Date(player.bookingSuspendedUntil).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card padding="lg" className={styles.card} data-testid="player-detail-account">
      <h2 className={styles.title}>{t('player.account.title')}</h2>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.label}>{t('player.account.type')}</dt>
          <dd className={styles.value}>
            <Badge variant={ACCOUNT_TYPE_VARIANT[player.accountType]} size="sm">
              {player.accountType === 'paid' && player.currentPlan
                ? player.currentPlan
                : t(`player.accountType.${player.accountType}`)}
            </Badge>
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>{t('player.account.email')}</dt>
          <dd className={styles.value}>
            <Badge variant={player.emailVerified ? 'success' : 'warning'} size="sm">
              {t(player.emailVerified ? 'player.account.verified' : 'player.account.unverified')}
            </Badge>
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>{t('player.account.noShow')}</dt>
          <dd className={styles.value}>
            {flagged ? (
              <Badge variant="danger" size="sm">
                {t('player.account.violations', { count: player.noShowViolations })}
              </Badge>
            ) : (
              t('player.account.violations', { count: player.noShowViolations })
            )}
          </dd>
        </div>
        {bookingSuspended && (
          <div className={styles.row}>
            <dt className={styles.label}>{t('player.account.bookingSuspended')}</dt>
            <dd className={styles.value}>
              <Badge variant="caution" size="sm">
                {suspendedUntil
                  ? t('player.account.suspendedUntil', { date: suspendedUntil })
                  : t('player.account.suspendedActive')}
              </Badge>
            </dd>
          </div>
        )}
      </dl>

      {bookingSuspended && (
        <Button
          variant="caution"
          size="sm"
          leftIcon={<PowerIcon />}
          isLoading={liftSuspension.isPending}
          onClick={() => liftSuspension.mutate()}
          data-testid="player-lift-suspension"
        >
          {t('player.account.liftSuspension')}
        </Button>
      )}
    </Card>
  );
}
