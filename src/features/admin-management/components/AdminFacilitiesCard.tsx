import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  Avatar,
  DataTable,
  EmptyState,
  IconButton,
  RatingStars,
  BuildingIcon,
  StadiumIcon,
  EyeIcon,
  InboxIcon,
  type Column,
  Thumb,
} from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { PATHS } from '@app/router/paths';
import type { RegionFacility } from '@features/facility-management/api';
import styles from './AdminFacilitiesCard.module.css';

interface Props {
  facilities: RegionFacility[];
  isLoading: boolean;
}

/**
 * The facilities-across-the-admin's-regions card: a DataTable of every facility
 * inside any region this admin manages. Each row links to the facility profile.
 */
export function AdminFacilitiesCard({ facilities, isLoading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo<Column<RegionFacility>[]>(
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
        key: 'owner',
        header: t('facility.col.owner'),
        render: (facility) => (
          <button
            type="button"
            className={styles.ownerLink}
            onClick={() => navigate(`${PATHS.ownerManagement}/${facility.ownerId}`)}
            title={facility.ownerName}
            data-testid={`admin-facility-owner-${facility.id}`}
          >
            <Avatar src={facility.ownerPhotoUrl} name={facility.ownerName} size="sm" />
            <span className={styles.ownerName}>{facility.ownerName}</span>
          </button>
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
    <Card className={styles.card} data-testid="admin-detail-facilities">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('admin.detail.sections.facilities')}</h2>
      </div>

      <DataTable<RegionFacility>
        columns={columns}
        data={facilities}
        isLoading={isLoading}
        getRowId={(facility) => facility.id}
        emptyState={<EmptyState icon={<InboxIcon />} title={t('admin.detail.facilities.empty')} />}
        rowActions={(facility) => (
          <IconButton
            size="sm"
            variant="ghost"
            label={t('admin.detail.facilities.view')}
            icon={<EyeIcon />}
            onClick={() => navigate(`${PATHS.facilityManagement}/${facility.id}`)}
            data-testid={`admin-facility-view-${facility.id}`}
          />
        )}
      />
    </Card>
  );
}
