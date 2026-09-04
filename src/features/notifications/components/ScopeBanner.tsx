import { useTranslation } from 'react-i18next';
import { GlobeIcon } from '@ui';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import styles from './scopeBanner.module.css';

/**
 * FR-ADM-SET-008 made visible: the admin should never wonder whether they are
 * looking at the whole platform or only their own regions.
 *
 * The wording differs from feedback's banner on purpose. A notification is
 * addressed to a person, so a regional admin still receives PLATFORM-WIDE
 * notices on top of their regions — saying only "you see your region" would be
 * wrong, and would make the platform rows in the list look like a bug.
 */
export function ScopeBanner() {
  const { t } = useTranslation();
  const { isSuperAdmin, isGeneralOversight, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();

  let text: string;
  if (isSuperAdmin) {
    text = t('notification.scope.allRegions');
  } else if (isGeneralOversight) {
    text = t('notification.scope.oversight');
  } else {
    // Only regions that still exist AND are active resolve to a name; a region
    // that was deactivated stops scoping anything, so say that plainly rather
    // than rendering a placeholder for a region the admin can no longer see.
    const names = (assignedRegionIds ?? [])
      .map((id) => regionsQuery.data?.find((region) => region.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) {
      text = regionsQuery.isLoading ? t('common.loading') : t('notification.scope.noLiveRegions');
    } else if (names.length > 1) {
      text = t('notification.scope.yourRegions', { names: names.join(', ') });
    } else {
      text = t('notification.scope.yourRegion', { name: names[0] });
    }
  }

  return (
    <p className={styles.banner} data-testid="notification-scope">
      <GlobeIcon />
      {text}
    </p>
  );
}
