import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge, clsx } from '@ui';
import {
  TIER_ORDER,
  planPrice,
  planTierBadgeVariant,
  type BillingPeriod,
  type OwnerSubscription,
  type PlanTier,
  type PlatformPlan,
} from '../api/subscription.types';
import { useChangeOwnerSubscription } from '../hooks/useSubscription';
import styles from './OwnerSubscriptionUpgradeModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  subscription: OwnerSubscription;
  plans: PlatformPlan[];
}

/**
 * Change an owner's platform plan — the current tier (renew / extend) or any
 * higher tier (upgrade). Downgrades and cancellation are intentionally not
 * offered (admin can only raise or extend a subscription).
 */
export function OwnerSubscriptionUpgradeModal({
  isOpen,
  onClose,
  ownerId,
  subscription,
  plans,
}: Props) {
  const { t, i18n } = useTranslation();
  const mutation = useChangeOwnerSubscription(ownerId);

  const currentOrder = TIER_ORDER[subscription.tier];
  const options = useMemo(
    () =>
      plans
        .filter((plan) => plan.isActive && plan.displayOrder >= currentOrder)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [plans, currentOrder],
  );
  const defaultTier =
    options.find((plan) => plan.displayOrder > currentOrder)?.tier ?? subscription.tier;

  const [tier, setTier] = useState<PlanTier>(defaultTier);
  const [period, setPeriod] = useState<BillingPeriod>(subscription.billingPeriod);

  useEffect(() => {
    if (isOpen) {
      setTier(defaultTier);
      setPeriod(subscription.billingPeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const money = (amount: number) =>
    amount > 0
      ? `${new Intl.NumberFormat(locale).format(amount)} ${t('owner.sub.currency')}`
      : t('owner.sub.freePrice');

  const selected = options.find((plan) => plan.tier === tier);
  const isRenewal = tier === subscription.tier;
  const confirmKey = isRenewal ? 'owner.sub.confirmRenew' : 'owner.sub.confirmUpgrade';

  const confirm = () => {
    mutation.mutate(
      { targetTier: tier, billingPeriod: period, changeType: isRenewal ? 'renewal' : 'upgrade' },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('owner.sub.changeTitle')}
      description={t('owner.sub.changeSubtitle', { tier: subscription.tierName })}
      size="md"
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirm}
            isLoading={mutation.isPending}
            disabled={!selected}
            data-testid="owner-sub-confirm"
          >
            {selected ? t(confirmKey, { tier: selected.name }) : t('owner.sub.upgrade')}
          </Button>
        </>
      }
    >
      <div className={styles.periodToggle} role="group" aria-label={t('owner.sub.billing')}>
        {(['monthly', 'yearly'] as BillingPeriod[]).map((value) => (
          <button
            key={value}
            type="button"
            className={clsx(styles.periodBtn, period === value && styles.periodActive)}
            aria-pressed={period === value}
            onClick={() => setPeriod(value)}
          >
            {t(`owner.sub.period.${value}`)}
          </button>
        ))}
      </div>

      <ul className={styles.plans}>
        {options.map((plan) => {
          const isCurrent = plan.tier === subscription.tier;
          const active = plan.tier === tier;
          return (
            <li key={plan.id}>
              <button
                type="button"
                className={clsx(styles.plan, active && styles.planActive)}
                onClick={() => setTier(plan.tier)}
                aria-pressed={active}
                data-testid={`owner-sub-plan-${plan.tier}`}
              >
                <span className={styles.planHead}>
                  <span className={styles.planName}>
                    <Badge variant={planTierBadgeVariant(plan.tier)} size="sm">
                      {plan.name}
                    </Badge>
                    <span className={styles.planTag}>
                      {t(isCurrent ? 'owner.sub.renewTag' : 'owner.sub.upgradeTag')}
                    </span>
                  </span>
                  <span className={styles.planPrice}>
                    {money(planPrice(plan, period))}
                    {planPrice(plan, period) > 0 && (
                      <span className={styles.planPer}> / {t(`owner.sub.per.${period}`)}</span>
                    )}
                  </span>
                </span>
                <span className={styles.planFeatures}>
                  {t('owner.sub.maxFacilities', {
                    max:
                      plan.featureGate.maxFacilities === null
                        ? '∞'
                        : plan.featureGate.maxFacilities,
                  })}
                  {plan.featureGate.prioritySupport && ` · ${t('owner.sub.prioritySupport')}`}
                  {plan.featureGate.campaigns && ` · ${t('owner.sub.campaigns')}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
