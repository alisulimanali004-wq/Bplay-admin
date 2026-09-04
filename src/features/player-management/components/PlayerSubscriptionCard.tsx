import { useTranslation } from 'react-i18next';
import { Card, Badge, EmptyState, ErrorState, Spinner, InboxIcon } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { usePlayerSubscription } from '../hooks/usePlayerRelated';
import styles from './playerCards.module.css';

interface Props {
  playerId: string;
}

/** The player's paid Bplay platform subscription — plan, status, billing, invoices. */
export function PlayerSubscriptionCard({ playerId }: Props) {
  const { t, i18n } = useTranslation();
  const { data: sub, isLoading, isError, refetch } = usePlayerSubscription(playerId);
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const nf = new Intl.NumberFormat(locale);
  const fmt = (value?: string) =>
    value ? new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <Card padding="lg" className={styles.card} data-testid="player-subscription-card">
      <h2 className={styles.title}>{t('player.subscription.title')}</h2>

      {isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : isLoading || !sub ? (
        <Spinner />
      ) : sub.accountType !== 'paid' ? (
        <EmptyState
          icon={<InboxIcon />}
          title={t('player.subscription.free')}
          description={t('player.subscription.freeDesc')}
        />
      ) : (
        <>
          <div className={styles.planHead}>
            <span className={styles.planName}>{sub.planName}</span>
            {sub.status && (
              <Badge variant={statusToBadgeVariant(sub.status)} size="sm">
                {t(`player.subscriptionStatus.${sub.status}`)}
              </Badge>
            )}
            {sub.billingPeriod && (
              <Badge variant="info" size="sm">
                {t(`player.billing.${sub.billingPeriod}`)}
              </Badge>
            )}
          </div>

          <dl className={styles.rows}>
            {typeof sub.priceSyp === 'number' && (
              <div className={styles.row}>
                <dt className={styles.label}>{t('player.subscription.price')}</dt>
                <dd className={styles.value}>
                  {nf.format(sub.priceSyp)} {t('player.detail.stats.currency')}
                </dd>
              </div>
            )}
            <div className={styles.row}>
              <dt className={styles.label}>{t('player.subscription.started')}</dt>
              <dd className={styles.value}>{fmt(sub.startDate)}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.label}>{t('player.subscription.renews')}</dt>
              <dd className={styles.value}>{fmt(sub.renewalDate)}</dd>
            </div>
          </dl>

          {sub.invoices.length > 0 && (
            <div>
              <h3 className={styles.subtle}>{t('player.subscription.invoices')}</h3>
              <ul className={styles.invoiceList}>
                {sub.invoices.map((invoice) => (
                  <li key={invoice.id} className={styles.invoice}>
                    <span className={styles.meta} dir="ltr">
                      {fmt(invoice.date)}
                    </span>
                    <span>{invoice.planName}</span>
                    <span className={styles.invoiceAmount}>
                      {nf.format(invoice.amountSyp)} {t('player.detail.stats.currency')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
