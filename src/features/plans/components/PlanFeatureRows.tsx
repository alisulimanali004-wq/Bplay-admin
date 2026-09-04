import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BanIcon,
  BarChartIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  clsx,
  ImageIcon,
  MessageCircleIcon,
  SparklesIcon,
  StarIcon,
  TrendingUpIcon,
  XIcon,
} from '@ui';
import { usePlanFormat } from '../hooks/usePlanFormat';
import type { Plan } from '../api/plan.types';
import styles from './planFeatureRows.module.css';

type RowKind = 'flag' | 'count';

interface FeatureRow {
  key: string;
  label: string;
  icon: ReactNode;
  kind: RowKind;
  flag?: boolean;
  /** `null` = unlimited (∞). */
  count?: number | null;
  /** Renders `0` as an explicit "off" mark instead of the digit. */
  zeroIsOff?: boolean;
  /** Unit appended to a numeric value (e.g. "days"). */
  unit?: 'days';
  /** The community-posting entitlement — the catalog's flagship perk (FR-ADM-PLAN-005). */
  isFlagship?: boolean;
}

/**
 * The rows a plan shows are driven by its audience — a player plan and an owner
 * tier grant completely different things, exactly like athlux renders a different
 * row set per plan segment. Every field of the audience is ALWAYS rendered, even
 * when off or null: the admin must see precisely what the catalog stores.
 */
function buildRows(plan: Plan, t: (key: string) => string): FeatureRow[] {
  if (plan.audience === 'player') {
    return [
      {
        key: 'communityPost',
        label: t('plan.entitlement.communityPost'),
        icon: <MessageCircleIcon />,
        kind: 'flag',
        flag: plan.entitlements.communityPost,
        isFlagship: true,
      },
      {
        key: 'communityMedia',
        label: t('plan.entitlement.communityMedia'),
        icon: <ImageIcon />,
        kind: 'flag',
        flag: plan.entitlements.communityMedia,
      },
      {
        key: 'advancedStats',
        label: t('plan.entitlement.advancedStats'),
        icon: <TrendingUpIcon />,
        kind: 'flag',
        flag: plan.entitlements.advancedStats,
      },
      {
        key: 'prioritySupport',
        label: t('plan.entitlement.prioritySupport'),
        icon: <SparklesIcon />,
        kind: 'flag',
        flag: plan.entitlements.prioritySupport,
      },
      {
        key: 'monthlyBookingLimit',
        label: t('plan.entitlement.monthlyBookingLimit'),
        icon: <CalendarIcon />,
        kind: 'count',
        count: plan.entitlements.monthlyBookingLimit,
        zeroIsOff: true,
      },
    ];
  }

  return [
    {
      key: 'maxFacilities',
      label: t('plan.gate.maxFacilities'),
      icon: <BuildingIcon />,
      kind: 'count',
      count: plan.featureGate.maxFacilities,
      zeroIsOff: true,
    },
    {
      key: 'statsRetentionDays',
      label: t('plan.gate.statsRetentionDays'),
      icon: <BarChartIcon />,
      kind: 'count',
      count: plan.featureGate.statsRetentionDays,
      unit: 'days',
    },
    {
      key: 'bannerUpload',
      label: t('plan.gate.bannerUpload'),
      icon: <ImageIcon />,
      kind: 'flag',
      flag: plan.featureGate.bannerUpload,
    },
    {
      key: 'reviewReply',
      label: t('plan.gate.reviewReply'),
      icon: <StarIcon />,
      kind: 'flag',
      flag: plan.featureGate.reviewReply,
    },
    {
      key: 'campaigns',
      label: t('plan.gate.campaigns'),
      icon: <SparklesIcon />,
      kind: 'flag',
      flag: plan.featureGate.campaigns,
    },
    {
      key: 'prioritySupport',
      label: t('plan.gate.prioritySupport'),
      icon: <CheckIcon />,
      kind: 'flag',
      flag: plan.featureGate.prioritySupport,
    },
  ];
}

interface Props {
  plan: Plan;
  /** `card` trims to the essentials; `detail` shows the whole set with icons. */
  variant?: 'card' | 'detail';
}

/** The entitlement matrix of a single plan, rendered the same way everywhere. */
export function PlanFeatureRows({ plan, variant = 'card' }: Props) {
  const { t } = useTranslation();
  const fmt = usePlanFormat();
  const rows = buildRows(plan, t);

  return (
    <ul className={clsx(styles.rows, variant === 'detail' && styles.detail)}>
      {rows.map((row) => {
        const isOff =
          row.kind === 'flag' ? !row.flag : row.zeroIsOff === true && row.count === 0;
        const isUnlimited = row.kind === 'count' && row.count === null;

        return (
          <li key={row.key} className={clsx(styles.row, isOff && styles.rowOff)}>
            {variant === 'detail' && (
              <span className={styles.rowIcon} aria-hidden>
                {row.icon}
              </span>
            )}
            <span className={clsx(styles.label, row.isFlagship && styles.flagship)}>
              {row.label}
            </span>

            {row.kind === 'flag' ? (
              <span className={clsx(styles.mark, row.flag ? styles.on : styles.off)}>
                {row.flag ? <CheckIcon /> : <XIcon />}
                <span className={styles.srOnly}>
                  {t(row.flag ? 'plan.value.included' : 'plan.value.excluded')}
                </span>
              </span>
            ) : isOff ? (
              <span className={clsx(styles.mark, styles.off)}>
                <BanIcon />
                <span className={styles.srOnly}>{t('plan.value.notAllowed')}</span>
              </span>
            ) : (
              <span className={clsx(styles.value, isUnlimited && styles.unlimited)}>
                {isUnlimited ? (
                  t('plan.value.unlimited')
                ) : (
                  <bdi>{row.unit === 'days' ? fmt.days(row.count ?? 0) : fmt.ceiling(row.count ?? 0)}</bdi>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
