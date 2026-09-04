import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  DataTable,
  EmptyState,
  RatingStars,
  BuildingIcon,
  StadiumIcon,
  InboxIcon,
  type Column,
  Thumb,
} from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { PATHS } from '@app/router/paths';
import type { FacilityListItem } from '@features/facility-management/api';
import styles from './OwnerFacilitiesCard.module.css';

interface Props {
  facilities: FacilityListItem[];
  isLoading: boolean;
}

/**
 * The owner's facilities card: a DataTable of every facility this owner owns.
 * Each row opens the facility profile.
 */
export function OwnerFacilitiesCard({ facilities, isLoading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo<Column<FacilityListItem>[]>(
    () => [
      {
        key: 'name',
        header: t('facility.col.name'),
        render: (facility) => (
          <span className={styles.nameCell}>
            <Thumb
              src={facility.thumbnailUrl}
              className={styles.thumb}
              fallbackClassName={styles.thumbFallback}
              fallback={<StadiumIcon />}
            />
            <span className={styles.name}>{facility.name}</span>
            <span
              className={styles.kindGlyph}
              role="img"
              aria-label={t(`facility.kind.${facility.kind}`)}
              title={t(`facility.kind.${facility.kind}`)}
            >
              {facility.kind === 'club' ? <BuildingIcon /> : <StadiumIcon />}
            </span>
          </span>
        ),
      },
      {
        key: 'location',
        header: t('owner.detail.facilities.location'),
        render: (facility) => (
          <span className={styles.owner}>
            {facility.city ||
              (facility.governorate ? t(`facility.governorate.${facility.governorate}`) : '—')}
          </span>
        ),
      },
      {
        key: 'rating',
        header: t('facility.col.rating'),
        render: (facility) => <RatingStars value={facility.rating ?? null} size="sm" />,
      },
      {
        key: 'status',
        header: t('facility.col.status'),
        render: (facility) => (
          <Badge variant={statusToBadgeVariant(facility.status)}>
            {t(`status.${facility.status}`)}
          </Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <Card className={styles.card} data-testid="owner-detail-facilities">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('owner.detail.sections.facilities')}</h2>
      </div>

      <DataTable<FacilityListItem>
        columns={columns}
        data={facilities}
        isLoading={isLoading}
        getRowId={(facility) => facility.id}
        onRowClick={(facility) => navigate(`${PATHS.facilityManagement}/${facility.id}`)}
        emptyState={<EmptyState icon={<InboxIcon />} title={t('owner.detail.facilities.empty')} />}
      />
    </Card>
  );
}
