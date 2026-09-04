import { useTranslation } from 'react-i18next';
import { ClockIcon, GlobeIcon } from '@ui';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import styles from './ScopeBanner.module.css';

export interface ScopeBannerProps {
  /** Scope-wide count of pending submissions (from the shared stats query). */
  pendingCount?: number;
  /** Scope-wide count of pending submissions waiting over 48h. */
  agedCount?: number;
  /** Count of facilities outside every region — super_admin only. */
  orphanCount?: number;
}

/**
 * The slim glass strip on top of the review desk: who the signed-in admin is
 * allowed to see (all regions / their regions / general oversight) plus the
 * scope-aware pending chip and an amber aged chip when submissions go stale. All
 * counts are passed in from the page's single stats query.
 */
export function ScopeBanner({ pendingCount, agedCount = 0, orphanCount }: ScopeBannerProps) {
  const { t } = useTranslation();
  const { isSuperAdmin, isGeneralOversight, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();

  let scopeText: string;
  if (isSuperAdmin) {
    scopeText =
      typeof orphanCount === 'number' && orphanCount > 0
        ? `${t('facility.scope.allRegions')} · ${t('facility.scope.orphans', { count: orphanCount })}`
        : t('facility.scope.allRegions');
  } else if (isGeneralOversight) {
    scopeText = t('facility.scope.oversight');
  } else {
    const names = (assignedRegionIds ?? [])
      .map((id) => regionsQuery.data?.find((region) => region.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    scopeText =
      names.length > 1
        ? t('facility.scope.yourRegions', { names: names.join(', ') })
        : t('facility.scope.yourRegion', { name: names[0] ?? '…' });
  }

  return (
    <div className={styles.banner} data-testid="scope-banner">
      <GlobeIcon className={styles.icon} />
      <span className={styles.text}>{scopeText}</span>

      <div className={styles.chips}>
        {typeof pendingCount === 'number' && (
          <span className={styles.chip}>
            {t('facility.scope.pending', { count: pendingCount })}
          </span>
        )}
        {agedCount > 0 && (
          <span className={styles.chip}>
            <ClockIcon className={styles.chipIcon} />
            {t('facility.scope.aged', { count: agedCount })}
          </span>
        )}
      </div>
    </div>
  );
}
