import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Button, Spinner, MapPinIcon } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { PATHS } from '@app/router/paths';
import { useNeighbourhoods } from '@features/region-management/hooks/useNeighbourhoods';
import type { Region } from '@features/region-management/api/region.types';
import styles from './AdminRegionsCard.module.css';

interface Props {
  regions: Region[];
  isLoading: boolean;
  /**
   * Neighbourhoods GRANTED within the cities above. When a city has any, the
   * admin covers only those — not the whole city.
   */
  includedNeighbourhoodIds?: string[];
  /**
   * Neighbourhoods carved OUT of the city grants above. A city row that hides
   * these would overstate the admin's reach — "Riyadh" reads as the whole city
   * when it may exclude several of its neighbourhoods.
   */
  excludedNeighbourhoodIds?: string[];
  /** Open the page-owned assign-regions modal. */
  onManage: () => void;
}

/**
 * The managed-regions card for a regional admin: each region the admin manages
 * with its status, linking to the region detail. "Manage" opens the same
 * assign-regions modal the header uses.
 */
export function AdminRegionsCard({
  regions,
  isLoading,
  includedNeighbourhoodIds = [],
  excludedNeighbourhoodIds = [],
  onManage,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: neighbourhoods } = useNeighbourhoods();

  // Granted and excluded neighbourhood names, per city id. A city showing
  // neither covers the whole city.
  const grantsByCity = new Map<string, string[]>();
  const exclusionsByCity = new Map<string, string[]>();
  for (const hood of neighbourhoods ?? []) {
    if (includedNeighbourhoodIds.includes(hood.id)) {
      grantsByCity.set(hood.cityId, [...(grantsByCity.get(hood.cityId) ?? []), hood.name]);
    }
    if (excludedNeighbourhoodIds.includes(hood.id)) {
      exclusionsByCity.set(hood.cityId, [...(exclusionsByCity.get(hood.cityId) ?? []), hood.name]);
    }
  }

  return (
    <Card className={styles.card} data-testid="admin-detail-regions">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('admin.detail.sections.regions')}</h2>
        <Button variant="secondary" size="sm" leftIcon={<MapPinIcon />} onClick={onManage}>
          {t('admin.detail.regions.manage')}
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : regions.length === 0 ? (
        <p className={styles.empty}>{t('admin.detail.regions.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {regions.map((region) => (
            <li className={styles.row} key={region.id}>
              <span className={styles.rowIcon} aria-hidden>
                <MapPinIcon />
              </span>
              <div className={styles.meta}>
                <button
                  type="button"
                  className={styles.nameLink}
                  onClick={() => navigate(`${PATHS.regionManagement}/${region.id}`)}
                  data-testid={`admin-region-${region.id}`}
                >
                  {region.name}
                </button>
                {grantsByCity.has(region.id) ? (
                  <span className={styles.exclusions}>
                    {t('admin.detail.regions.only', {
                      names: grantsByCity.get(region.id)?.join(', '),
                    })}
                  </span>
                ) : exclusionsByCity.has(region.id) ? (
                  <span className={styles.exclusions}>
                    {t('admin.detail.regions.except', {
                      names: exclusionsByCity.get(region.id)?.join(', '),
                    })}
                  </span>
                ) : null}
              </div>
              <Badge variant={statusToBadgeVariant(region.status)}>
                {t(`region.status.${region.status}`)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
