import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BuildingIcon, RatingStars, RegionTag, StadiumIcon, Thumb, type Column } from '@ui';
import { FacilityStatusBadge } from './FacilityStatusBadge';
import { FacilitySourceBadge } from './FacilitySourceBadge';
import type { FacilityListItem } from '../api/facility.types';
import styles from './useFacilityColumns.module.css';

export interface UseFacilityColumnsOptions {
  /** Open the owner's profile (the cell stops row-click propagation itself). */
  onOwnerClick: (ownerId: string) => void;
}

/**
 * The directory table's columns: thumbnail + name + kind glyph, link-styled
 * owner, sports summary ("Padel +2"), compact RegionTag, RatingStars, status
 * badge and a localized created date.
 */
export function useFacilityColumns({
  onOwnerClick,
}: UseFacilityColumnsOptions): Column<FacilityListItem>[] {
  const { t, i18n } = useTranslation();

  return useMemo<Column<FacilityListItem>[]>(
    () => [
      {
        key: 'name',
        header: t('facility.col.name'),
        sortable: true,
        render: (item) => (
          <span className={styles.nameCell}>
            <Thumb
              src={item.thumbnailUrl}
              className={styles.thumb}
              fallbackClassName={styles.thumbFallback}
              fallback={<StadiumIcon />}
            />
            <span className={styles.name}>{item.name}</span>
            <span
              className={styles.kindGlyph}
              role="img"
              aria-label={t(`facility.kind.${item.kind}`)}
              title={t(`facility.kind.${item.kind}`)}
            >
              {item.kind === 'club' ? <BuildingIcon /> : <StadiumIcon />}
            </span>
            <FacilitySourceBadge source={item.source} />
          </span>
        ),
      },
      {
        key: 'owner',
        header: t('facility.col.owner'),
        render: (item) => (
          <button
            type="button"
            className={styles.ownerLink}
            onClick={(event) => {
              event.stopPropagation();
              onOwnerClick(item.ownerId);
            }}
            data-testid={`facility-owner-link-${item.id}`}
          >
            {item.ownerName}
          </button>
        ),
      },
      {
        key: 'sport',
        header: t('facility.col.sport'),
        render: (item) =>
          item.sports.length === 0 ? (
            <span aria-hidden>&mdash;</span>
          ) : (
            <span className={styles.sports}>
              {t(`facility.sport.${item.sports[0]}`)}
              {item.sports.length > 1 && (
                <span className={styles.more}>+{item.sports.length - 1}</span>
              )}
            </span>
          ),
      },
      {
        key: 'region',
        header: t('facility.col.region'),
        render: (item) => (
          <RegionTag regionNames={item.regionNames} isOrphan={item.isOrphan} compact />
        ),
      },
      {
        key: 'rating',
        header: t('facility.col.rating'),
        sortable: true,
        render: (item) => <RatingStars value={item.rating ?? null} size="sm" />,
      },
      {
        key: 'status',
        header: t('facility.col.status'),
        render: (item) => <FacilityStatusBadge status={item.status} />,
      },
      {
        key: 'created',
        header: t('facility.col.created'),
        sortable: true,
        render: (item) => (
          <span className={styles.date}>
            {new Date(item.createdAt).toLocaleDateString(i18n.language, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
    ],
    [t, i18n.language, onOwnerClick],
  );
}
