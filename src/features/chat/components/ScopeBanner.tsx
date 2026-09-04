import { useTranslation } from 'react-i18next';
import { GlobeIcon } from '@ui';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import styles from './scopeBanner.module.css';

/**
 * FR-ADM-CHAT-004 made visible: the admin should never wonder whether they are
 * looking at every owner or only the ones in their own regions. Same three-way
 * message as feedback's and facility-management's banners.
 */
export function ScopeBanner() {
  const { t } = useTranslation();
  const { isSuperAdmin, isGeneralOversight, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();

  let text: string;
  if (isSuperAdmin) {
    text = t('chat.scope.allRegions');
  } else if (isGeneralOversight) {
    text = t('chat.scope.oversight');
  } else {
    // Only regions that still exist AND are active resolve to a name; a region
    // that was deactivated stops scoping anything, so say that plainly rather
    // than rendering a placeholder for a region the admin can no longer see.
    const names = (assignedRegionIds ?? [])
      .map((id) => regionsQuery.data?.find((region) => region.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) {
      text = regionsQuery.isLoading ? t('common.loading') : t('chat.scope.noLiveRegions');
    } else if (names.length > 1) {
      text = t('chat.scope.yourRegions', { names: names.join(', ') });
    } else {
      text = t('chat.scope.yourRegion', { name: names[0] });
    }
  }

  return (
    <p className={styles.banner} data-testid="chat-scope">
      <GlobeIcon />
      {text}
    </p>
  );
}
