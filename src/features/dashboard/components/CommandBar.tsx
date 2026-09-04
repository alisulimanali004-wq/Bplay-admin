import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, Select, clsx, BarChartIcon, DownloadIcon, RotateCcwIcon } from '@ui';
import { useDashboardStore } from '../store/dashboard.store';
import { useDashboardRegions } from '../hooks/useDashboard';
import type { RangeKey } from '../api/dashboard.types';
import styles from './CommandBar.module.css';

const RANGES: RangeKey[] = ['today', '7d', '30d', '90d', 'month'];

interface Props {
  asOf?: string;
  isFetching: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

/** Sticky global controls — one time-range + region scope drive the whole page. */
export function CommandBar({ asOf, isFetching, onRefresh, onExport }: Props) {
  const { t } = useTranslation();
  const range = useDashboardStore((s) => s.range);
  const regionId = useDashboardStore((s) => s.regionId);
  const setRange = useDashboardStore((s) => s.setRange);
  const setRegion = useDashboardStore((s) => s.setRegion);
  const { data: regions } = useDashboardRegions();

  const regionOptions = useMemo(
    () => [
      { value: 'all', label: t('dashboard.region.all') },
      ...(regions ?? []).map((r) => ({ value: r.id, label: r.name })),
      { value: 'orphan', label: t('dashboard.region.orphan') },
    ],
    [regions, t],
  );

  const asOfTime = asOf
    ? new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className={styles.bar}>
      <div className={styles.title}>
        <BarChartIcon className={styles.titleIcon} aria-hidden />
        <span>{t('dashboard.title')}</span>
      </div>

      <div className={styles.controls}>
        <div className={styles.range} role="group" aria-label={t('dashboard.rangeLabel')}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={clsx(styles.rangeBtn, range === r && styles.rangeBtnActive)}
              aria-pressed={range === r}
              onClick={() => setRange(r)}
            >
              {t(`dashboard.range.${r}`)}
            </button>
          ))}
        </div>

        <Select
          className={styles.region}
          value={regionId}
          onChange={setRegion}
          options={regionOptions}
          aria-label={t('dashboard.regionLabel')}
        />

        <span className={styles.freshness}>
          <span className={clsx(styles.liveDot, isFetching && styles.liveDotBusy)} aria-hidden />
          {t('dashboard.freshness', { time: asOfTime })}
        </span>

        <IconButton
          variant="secondary"
          label={t('dashboard.refresh')}
          icon={<RotateCcwIcon className={clsx(isFetching && styles.spinning)} />}
          onClick={onRefresh}
        />
        <Button variant="secondary" size="sm" leftIcon={<DownloadIcon />} onClick={onExport}>
          {t('common.export')}
        </Button>
      </div>
    </div>
  );
}
