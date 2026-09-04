import { useTranslation } from 'react-i18next';
import { ErrorState, useToast } from '@ui';
import { useAuthRole } from '@shared/stores/authStore';
import { useDashboard, useDashboardRegions } from '../hooks/useDashboard';
import { useDashboardStore } from '../store/dashboard.store';
import { exportDashboard } from '../lib/dashboardExport';
import { CommandBar } from '../components/CommandBar';
import { HeroBand } from '../components/HeroBand';
import { KpiBento } from '../components/KpiBento';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import {
  ActivitySection,
  DemandSection,
  DomainSection,
  LiquiditySection,
  RegionSection,
  TrendsSection,
} from '../components/DashboardSections';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const role = useAuthRole();
  const range = useDashboardStore((s) => s.range);
  const regionId = useDashboardStore((s) => s.regionId);
  const { data, isLoading, isError, error, isFetching, refetch } = useDashboard({ range, regionId });
  const { data: regions } = useDashboardRegions();

  const regionLabel =
    regionId === 'all'
      ? t('dashboard.region.all')
      : regionId === 'orphan'
        ? t('dashboard.region.orphan')
        : (regions?.find((r) => r.id === regionId)?.name ?? regionId);

  const handleExport = async () => {
    if (!data) return;
    try {
      await exportDashboard(data, t, range, regionLabel);
      toast.success(t('dashboard.exported'));
    } catch {
      toast.error(t('common.loadError'));
    }
  };

  return (
    <div className={styles.page} data-testid="dashboard-page">
      <CommandBar
        asOf={data?.asOf}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        onExport={handleExport}
      />
      <div className={styles.body}>
        {isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <ErrorState
            title={t('common.errorTitle')}
            message={error instanceof Error ? error.message : t('common.loadError')}
            retryLabel={t('common.retry')}
            onRetry={() => refetch()}
          />
        ) : data ? (
          <>
            <HeroBand data={data} />
            <KpiBento kpis={data.kpis} />
            <LiquiditySection data={data} />
            <TrendsSection data={data} />
            <DemandSection data={data} />
            {role === 'super_admin' && <RegionSection data={data} />}
            <DomainSection data={data} />
            <ActivitySection data={data} />
          </>
        ) : null}
      </div>
    </div>
  );
}
