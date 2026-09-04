import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  clsx,
  BarChartIcon,
  BuildingIcon,
  CreditCardIcon,
  LayersIcon,
  MapPinIcon,
  MessageCircleIcon,
  UserCheckIcon,
  UsersIcon,
  WalletIcon,
} from '@ui';
import { useCountUp } from '@shared/hooks/useCountUp';
import { Delta, SectionHeader } from './DashboardKit';
import { Sparkline } from './DashboardCharts';
import { fmtCompact, fmtInt } from './format';
import { useDashboardStore } from '../store/dashboard.store';
import type { KpiAccent, KpiDatum, SeriesColor } from '../api/dashboard.types';
import colors from './colors.module.css';
import styles from './KpiBento.module.css';

const KPI_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  gmv: WalletIcon,
  facilities: BuildingIcon,
  players: UsersIcon,
  subscriptions: CreditCardIcon,
  owners: UserCheckIcon,
  regions: MapPinIcon,
  community: MessageCircleIcon,
  b2bRevenue: LayersIcon,
};

const ACCENT_COLOR: Record<KpiAccent, SeriesColor> = {
  primary: 'mint',
  secondary: 'amber',
  info: 'blue',
  sage: 'sage',
};

export function KpiBento({ kpis }: { kpis: KpiDatum[] }) {
  const { t } = useTranslation();
  const range = useDashboardStore((s) => s.range);
  const baseline = t('dashboard.vsPrev', { range: t(`dashboard.range.${range}`) });

  return (
    <section>
      <SectionHeader
        eyebrow={t('dashboard.section.pulse.eyebrow')}
        title={t('dashboard.section.pulse.title')}
      />
      <div className={styles.grid}>
        {kpis.map((kpi, i) => (
          <KpiTile key={kpi.key} kpi={kpi} baseline={baseline} delay={i * 0.05} />
        ))}
      </div>
    </section>
  );
}

function KpiTile({ kpi, baseline, delay }: { kpi: KpiDatum; baseline: string; delay: number }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const raw = useCountUp(kpi.value);
  const display = kpi.money ? fmtCompact(raw) : fmtInt(raw);
  const Icon = KPI_ICON[kpi.key] ?? BarChartIcon;
  const accent = ACCENT_COLOR[kpi.accent];

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -4 }}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <Link to={kpi.to} className={styles.tile}>
        <span className={clsx(styles.accent, colors[accent])} aria-hidden />
        <div className={styles.head}>
          <span className={styles.label}>{t(`dashboard.kpi.${kpi.key}`)}</span>
          <span className={clsx(styles.icon, colors[accent])} aria-hidden>
            <Icon />
          </span>
        </div>
        <div className={styles.valueRow}>
          <span className={styles.value}>{display}</span>
          {kpi.denom != null && <span className={styles.denom}>/ {fmtInt(kpi.denom)}</span>}
          {kpi.money && <span className={styles.unit}>{t('common.currencySyp')}</span>}
          {kpi.extra && (
            <span className={styles.extra}>
              · {fmtInt(kpi.extra.count)} {t(`dashboard.extra.${kpi.extra.key}`)}
            </span>
          )}
        </div>
        <div className={styles.foot}>
          {kpi.deltaPct != null ? (
            <Delta pct={kpi.deltaPct} baseline={baseline} invert={kpi.invert} small />
          ) : kpi.note ? (
            <span className={styles.note}>
              {t(`dashboard.note.${kpi.note.key}`, { count: kpi.note.count ?? 0 })}
            </span>
          ) : (
            <span />
          )}
          {kpi.spark && <Sparkline data={kpi.spark} color={accent} w={72} h={28} />}
        </div>
      </Link>
    </motion.div>
  );
}
