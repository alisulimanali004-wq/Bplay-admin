import { useTranslation } from 'react-i18next';
import { GlobeIcon } from '@ui';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import styles from './scopeBanner.module.css';

/**
 * FR-ADM-FEED-005 made visible: the admin should never wonder whether they are
 * looking at the whole platform or only their own regions. Same three-way
 * message as facility-management's banner.
 */
export function ScopeBanner() {
  const { t } = useTranslation();
  const { isSuperAdmin, isGeneralOversight, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();

  let text: string;
  if (isSuperAdmin) {
    text = t('feedback.scope.allRegions');
  } else if (isGeneralOversight) {
    text = t('feedback.scope.oversight');
  } else {
    // Only regions that still exist AND are active resolve to a name; a region
    // that was deactivated stops scoping anything, so say that plainly rather
    // than rendering a placeholder for a region the admin can no longer see.
    const names = (assignedRegionIds ?? [])
      .map((id) => regionsQuery.data?.find((region) => region.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) {
      text = regionsQuery.isLoading ? t('common.loading') : t('feedback.scope.noLiveRegions');
    } else if (names.length > 1) {
      text = t('feedback.scope.yourRegions', { names: names.join(', ') });
    } else {
      text = t('feedback.scope.yourRegion', { name: names[0] });
    }
  }

  return (
    <p className={styles.banner} data-testid="feedback-scope">
      <GlobeIcon />
      {text}
    </p>
  );
}
