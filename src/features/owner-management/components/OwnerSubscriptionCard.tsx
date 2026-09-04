import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Button, Spinner, EmptyState, SparklesIcon, InboxIcon } from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import {
  isExpiringSoon,
  planPrice,
  planTierBadgeVariant,
  subscriptionStatusBadgeVariant,
  invoiceStatusBadgeVariant,
  type OwnerSubscription,
} from '../api/subscription.types';
import {
  useOwnerInvoices,
  useOwnerSubscription,
  usePlatformPlans,
} from '../hooks/useSubscription';
import { OwnerSubscriptionUpgradeModal } from './OwnerSubscriptionUpgradeModal';
import styles from './OwnerSubscriptionCard.module.css';

interface Props {
  ownerId: string;
}

const DAY = 86_400_000;

/** The owner's platform subscription: current plan, key limits, and payment history. */
export function OwnerSubscriptionCard({ ownerId }: Props) {
  const { t, i18n } = useTranslation();
  const upgrade = useDisclosure();
  const { data: subscription, isLoading } = useOwnerSubscription(ownerId);
  const { data: plans } = usePlatformPlans();
  const { data: invoices } = useOwnerInvoices(ownerId);

  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const money = (amount: number) =>
    `${new Intl.NumberFormat(locale).format(amount)} ${t('owner.sub.currency')}`;
  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

  const plan = useMemo(
    () => plans?.find((item) => item.tier === subscription?.tier),
    [plans, subscription],
  );

  if (isLoading || !subscription) {
    return (
      <Card className={styles.card} data-testid="owner-detail-subscription">
        <div className={styles.loading}>
          <Spinner />
        </div>
      </Card>
    );
  }

  const rows = buildRows(subscription, plan ? planPrice(plan, subscription.billingPeriod) : 0, {
    money,
    dateLabel,
    t,
  });

  return (
    <Card className={styles.card} data-testid="owner-detail-subscription">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('owner.sub.title')}</h2>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<SparklesIcon />}
          onClick={upgrade.open}
          data-testid="owner-sub-upgrade"
        >
          {t('owner.sub.upgrade')}
        </Button>
      </div>

      <div className={styles.badges}>
        <Badge variant={planTierBadgeVariant(subscription.tier)}>{subscription.tierName}</Badge>
        <Badge variant={subscriptionStatusBadgeVariant(subscription.status)}>
          {t(`owner.sub.status.${subscription.status}`)}
        </Badge>
        {isExpiringSoon(subscription) && (
          <Badge variant="warning">{t('owner.sub.expiringSoon')}</Badge>
        )}
      </div>

      <dl className={styles.rows}>
        {rows.map((row) => (
          <div key={row.key} className={styles.row}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.history}>
        <h3 className={styles.subTitle}>{t('owner.sub.history')}</h3>
        {!invoices || invoices.length === 0 ? (
          <EmptyState icon={<InboxIcon />} title={t('owner.sub.noHistory')} />
        ) : (
          <ul className={styles.invoices}>
            {invoices.map((invoice) => (
              <li key={invoice.id} className={styles.invoice}>
                <span className={styles.invoiceMain}>
                  <span className={styles.invoiceTier}>
                    {invoice.tierName} · {t(`owner.sub.period.${invoice.billingPeriod}`)}
                  </span>
                  <span className={styles.invoiceRef}>
                    <span dir="ltr">{invoice.reference}</span> · {dateLabel(invoice.issuedAt)}
                  </span>
                </span>
                <span className={styles.invoiceAmount}>{money(invoice.amount)}</span>
                <Badge variant={invoiceStatusBadgeVariant(invoice.status)} size="sm">
                  {t(`owner.sub.invoiceStatus.${invoice.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <OwnerSubscriptionUpgradeModal
        isOpen={upgrade.isOpen}
        onClose={upgrade.close}
        ownerId={ownerId}
        subscription={subscription}
        plans={plans ?? []}
      />
    </Card>
  );
}

interface Row {
  key: string;
  label: string;
  value: string;
}

function buildRows(
  subscription: OwnerSubscription,
  price: number,
  helpers: {
    money: (amount: number) => string;
    dateLabel: (iso: string) => string;
    t: (key: string, options?: Record<string, unknown>) => string;
  },
): Row[] {
  const { money, dateLabel, t } = helpers;
  const rows: Row[] = [
    {
      key: 'price',
      label: t('owner.sub.price'),
      value:
        price > 0
          ? `${money(price)} / ${t(`owner.sub.per.${subscription.billingPeriod}`)}`
          : t('owner.sub.freePrice'),
    },
    { key: 'started', label: t('owner.sub.started'), value: dateLabel(subscription.startDate) },
  ];
  if (subscription.status === 'trial' && subscription.trialEndDate) {
    rows.push({
      key: 'trial',
      label: t('owner.sub.trialEnds'),
      value: dateLabel(subscription.trialEndDate),
    });
  } else {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(subscription.renewalDate).getTime() - Date.now()) / DAY),
    );
    rows.push({
      key: 'renews',
      label: t(subscription.status === 'expired' ? 'owner.sub.expiredOn' : 'owner.sub.renews'),
      value:
        subscription.status === 'expired'
          ? dateLabel(subscription.renewalDate)
          : `${dateLabel(subscription.renewalDate)} · ${t('owner.sub.daysLeft', { count: daysLeft })}`,
    });
  }
  return rows;
}
