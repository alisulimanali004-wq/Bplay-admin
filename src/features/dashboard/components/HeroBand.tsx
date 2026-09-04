import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  clsx,
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronEndIcon,
  ClockIcon,
  FileWarningIcon,
  FlagIcon,
  GaugeIcon,
  MapPinIcon,
  SparklesIcon,
  UserCheckIcon,
  WalletIcon,
} from '@ui';
import { useCountUp } from '@shared/hooks/useCountUp';
import { useAuthUser } from '@shared/stores/authStore';
import { firstName } from '@shared/utils/displayName';
import { Delta, Eyebrow } from './DashboardKit';
import { Sparkline } from './DashboardCharts';
import { fmtCompact, fmtInt } from './format';
import { useDashboardStore } from '../store/dashboard.store';
import { useDashboardRegions } from '../hooks/useDashboard';
import type { AttentionItem, DashboardData } from '../api/dashboard.types';
import colors from './colors.module.css';
import styles from './HeroBand.module.css';

const ATTENTION_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  pendingFacilities: BuildingIcon,
  pendingOwners: UserCheckIcon,
  playerReports: FlagIcon,
  flaggedPosts: FileWarningIcon,
  orphanFacilities: MapPinIcon,
  nearExpiry: ClockIcon,
  idleFacilities: GaugeIcon,
  newSubscriptions: SparklesIcon,
  // Queue keys the live statistics endpoint emits (statistics.service.js
  // ATTENTION_SPEC), alongside the mock's set above.
  underReviewBookings: CalendarIcon,
  openReports: FlagIcon,
  expiringSubscriptions: ClockIcon,
};

/** "oldest 13d" — the backend builds this key from a real age, so any N is valid. */
const OLDEST_META = /^oldest(\d+)d$/;

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

export function HeroBand({ data }: { data: DashboardData }) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const user = useAuthUser();
  const range = useDashboardStore((s) => s.range);
  const regionId = useDashboardStore((s) => s.regionId);
  const { data: regions } = useDashboardRegions();

  const bookings = useCountUp(data.hero.bookings, 0.8);
  const gmv = useCountUp(data.hero.gmvSyp, 0.8);

  const greetingName = firstName(user);
  const baseline = t('dashboard.vsPrev', { range: t(`dashboard.range.${range}`) });
  const regionLabel =
    regionId === 'all'
      ? t('dashboard.region.all')
      : regionId === 'orphan'
        ? t('dashboard.region.orphan')
        : (regions?.find((r) => r.id === regionId)?.name ?? regionId);
  const today = new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-SY' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <section>
      <Eyebrow>{t('dashboard.heroEyebrow')}</Eyebrow>
      <h1 className={styles.greeting}>
        {t(`dashboard.greeting.${greetingKey()}`)}, <span className={styles.greetingName}>{greetingName}</span>
      </h1>
      <p className={styles.subtitle}>
        {today} · {regionLabel} · {t(`dashboard.range.${range}`)}
      </p>

      <div className={styles.grid}>
        {/* North-star hero tile */}
        <motion.div
          className={styles.hero}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <div className={styles.heroWatermark} aria-hidden>
            <Sparkline data={data.hero.bookingsSpark} color="mint" w={900} h={180} />
          </div>
          <div className={styles.heroInner}>
            <div className={styles.heroMain}>
              <div className={styles.heroLabel}>
                <span className={styles.heroIcon} aria-hidden>
                  <CalendarIcon />
                </span>
                <Eyebrow>{t('dashboard.northStar')}</Eyebrow>
              </div>
              <div className={styles.heroValue}>{fmtInt(bookings)}</div>
              <div className={styles.heroMeta}>
                <Delta pct={data.hero.bookingsDeltaPct} baseline={baseline} />
                <span className={styles.heroTarget}>
                  <span className={styles.heroTargetDot} aria-hidden />
                  {t('dashboard.ofTarget', { pct: data.hero.targetPct })}
                </span>
              </div>
              <div className={styles.heroProgress}>
                <motion.div
                  className={styles.heroProgressFill}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${data.hero.targetPct}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                />
              </div>
            </div>

            {/* GMV co-primary */}
            <div className={styles.heroGmv}>
              <div className={styles.heroLabel}>
                <span className={clsx(styles.heroIcon, styles.heroIconAmber)} aria-hidden>
                  <WalletIcon />
                </span>
                <Eyebrow>{t('dashboard.kpi.gmv')}</Eyebrow>
              </div>
              <div className={styles.heroGmvValue}>
                {fmtCompact(gmv)}
                <span className={styles.heroGmvUnit}>{t('common.currencySyp')}</span>
              </div>
              <Delta pct={data.hero.gmvDeltaPct} baseline={baseline} small />
              <div className={styles.heroGmvSpark}>
                <Sparkline data={data.hero.gmvSpark} color="amber" w={160} h={44} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Needs-attention rail */}
        <motion.div
          className={styles.attn}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
        >
          <div className={styles.attnHead}>
            <span className={styles.attnHeadTitle}>
              <BellIcon className={styles.attnHeadIcon} aria-hidden />
              <Eyebrow>{t('dashboard.attention.heading')}</Eyebrow>
            </span>
            <span className={styles.attnTotal}>{data.attentionTotal}</span>
          </div>
          <div className={styles.attnList}>
            {data.attention.map((item) => (
              <AttentionRow key={item.key} item={item} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const { t } = useTranslation();
  const Icon = ATTENTION_ICON[item.key] ?? SparklesIcon;

  // `oldest{N}d` carries its own number, so it resolves through one
  // interpolated key instead of needing a translation per possible age.
  const oldest = item.metaKey ? OLDEST_META.exec(item.metaKey) : null;
  const meta = oldest
    ? t('dashboard.attentionMeta.oldestDays', { days: Number(oldest[1]) })
    : item.metaKey
      ? t(`dashboard.attentionMeta.${item.metaKey}`)
      : null;

  return (
    <Link to={item.to} className={styles.attnRow}>
      <span className={clsx(styles.attnChip, colors[item.tone])} aria-hidden>
        <Icon />
      </span>
      <span className={styles.attnBody}>
        <span className={styles.attnLabel}>{t(`dashboard.attention.${item.key}`)}</span>
        {meta && <span className={styles.attnMeta}>{meta}</span>}
      </span>
      <span className={clsx(styles.attnCount, colors[item.tone])}>{item.count}</span>
      <ChevronEndIcon className={clsx(styles.attnChevron, 'flipInRtl')} aria-hidden />
    </Link>
  );
}
