import { useTranslation } from 'react-i18next';
import { Badge, StarIcon, type Column } from '@ui';
import { usePlanFormat } from '../hooks/usePlanFormat';
import {
  planAudienceBadgeVariant,
  planKindBadgeVariant,
  planStatus,
  planStatusBadgeVariant,
  unlocksCommunity,
  type Plan,
} from '../api/plan.types';
import styles from './planTable.module.css';

/** Table sort keys → the `PlanListParams.sortBy` vocabulary. */
export const SORT_BY_COLUMN: Record<string, 'name' | 'price' | 'subscribers'> = {
  name: 'name',
  price: 'price',
  subscribers: 'subscribers',
};

/**
 * The plan's capability flags as `[label, enabled]`, in card order. Rendered as
 * `enabled/total` so the cell stays a number in both languages (no plural forms)
 * and still says how much of the audience's feature set the plan grants.
 */
function featureFlags(plan: Plan, t: (key: string) => string): Array<[string, boolean]> {
  if (plan.audience === 'player') {
    return [
      [t('plan.entitlement.communityPost'), plan.entitlements.communityPost],
      [t('plan.entitlement.communityMedia'), plan.entitlements.communityMedia],
      [t('plan.entitlement.advancedStats'), plan.entitlements.advancedStats],
      [t('plan.entitlement.prioritySupport'), plan.entitlements.prioritySupport],
    ];
  }
  return [
    [t('plan.gate.bannerUpload'), plan.featureGate.bannerUpload],
    [t('plan.gate.reviewReply'), plan.featureGate.reviewReply],
    [t('plan.gate.campaigns'), plan.featureGate.campaigns],
    [t('plan.gate.prioritySupport'), plan.featureGate.prioritySupport],
  ];
}

interface Options {
  onOpen: (plan: Plan) => void;
}

/**
 * The catalog table columns — the exact set FR-ADM-PLAN-001 asks for:
 * name · type · price · duration · features · status · subscribers.
 */
export function usePlanColumns({ onOpen }: Options): Column<Plan>[] {
  const { t } = useTranslation();
  const fmt = usePlanFormat();

  return [
    {
      key: 'name',
      header: t('plan.col.name'),
      sortable: true,
      render: (plan) => (
        <button
          type="button"
          className={styles.nameCell}
          onClick={() => onOpen(plan)}
          data-testid={`plan-open-${plan.id}`}
        >
          <span className={styles.nameRow}>
            {plan.name}
            {plan.isRecommended && (
              <span className={styles.star} title={t('plan.badge.recommended')}>
                <StarIcon />
                <span className={styles.srOnly}>{t('plan.badge.recommended')}</span>
              </span>
            )}
          </span>
          <span className={styles.tier} dir="ltr">
            {plan.tier}
          </span>
        </button>
      ),
    },
    {
      key: 'audience',
      header: t('plan.col.audience'),
      render: (plan) => (
        <Badge variant={planAudienceBadgeVariant(plan.audience)} size="sm">
          {t(`plan.audience.${plan.audience}`)}
        </Badge>
      ),
    },
    {
      key: 'kind',
      header: t('plan.col.kind'),
      render: (plan) => (
        <Badge variant={planKindBadgeVariant(plan.kind)} size="sm">
          {t(`plan.kind.${plan.kind}`)}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: t('plan.col.price'),
      align: 'end',
      sortable: true,
      render: (plan) => (
        <span className={styles.priceCell}>
          <bdi className={styles.priceValue}>{fmt.money(plan.priceSyp)}</bdi>
          {plan.audience === 'owner' && plan.yearlyPriceSyp !== null && plan.yearlyPriceSyp > 0 && (
            <span className={styles.priceSub}>
              <bdi>{fmt.money(plan.yearlyPriceSyp)}</bdi> {t('plan.price.perYear')}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'duration',
      header: t('plan.col.duration'),
      render: (plan) =>
        plan.audience === 'owner' ? (
          <span className={styles.muted}>{t('plan.price.monthlyOrYearly')}</span>
        ) : plan.durationDays === null ? (
          <span className={styles.muted}>{t('plan.price.ongoing')}</span>
        ) : (
          <bdi>{fmt.days(plan.durationDays)}</bdi>
        ),
    },
    {
      key: 'features',
      header: t('plan.col.features'),
      render: (plan) => {
        const flags = featureFlags(plan, t);
        const enabled = flags.filter(([, on]) => on);
        return (
          <span className={styles.chips}>
            {unlocksCommunity(plan) && (
              <Badge variant="info" size="sm">
                {t('plan.badge.community')}
              </Badge>
            )}
            <bdi
              className={styles.muted}
              title={enabled.length > 0 ? enabled.map(([label]) => label).join(', ') : undefined}
            >
              {fmt.number(enabled.length)}/{fmt.number(flags.length)}
            </bdi>
          </span>
        );
      },
    },
    {
      key: 'status',
      header: t('plan.col.status'),
      render: (plan) => (
        <Badge variant={planStatusBadgeVariant(plan)} size="sm">
          {t(`plan.status.${planStatus(plan)}`)}
        </Badge>
      ),
    },
    {
      key: 'subscribers',
      header: t('plan.col.subscribers'),
      align: 'end',
      sortable: true,
      render: (plan) => <bdi className={styles.subscribers}>{fmt.number(plan.subscriberCount)}</bdi>,
    },
  ];
}
