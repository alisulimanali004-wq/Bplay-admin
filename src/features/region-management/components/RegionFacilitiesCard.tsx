import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  DataTable,
  EmptyState,
  IconButton,
  RatingStars,
  Select,
  FilterField,
  BuildingIcon,
  StadiumIcon,
  EyeIcon,
  InboxIcon,
  MapPinIcon,
  type Column,
  Thumb,
} from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { PATHS } from '@app/router/paths';
import type { RegionFacility } from '@features/facility-management/api';
import { useNeighbourhoodsByCity } from '../hooks/useNeighbourhoods';
import type { Region } from '../api/region.types';
import styles from './RegionFacilitiesCard.module.css';

interface Props {
  region: Region;
  facilities: RegionFacility[];
  isLoading: boolean;
}

/** Filter value for facilities the server filed under no neighbourhood. */
const NONE = '__none__';

/**
 * The facilities-and-courts in this region.
 *
 * The rows come from the server filtered by `regionId`, i.e. the facility's
 * STORED city — not a coordinate test in the browser. On top of that, a
 * neighbourhood filter narrows to one area within the city.
 *
 * There is no "Add facility" here on purpose: creating one from a region page
 * seeded its coordinates from the region centre, which invents a location the
 * operator never chose. Facilities are created from the facilities screen,
 * where the location is picked explicitly.
 */
export function RegionFacilitiesCard({ region, facilities, isLoading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: neighbourhoods } = useNeighbourhoodsByCity(region.id);
  const [hood, setHood] = useState<string>('all');

  const visible = useMemo(() => {
    if (hood === 'all') return facilities;
    if (hood === NONE) return facilities.filter((facility) => !facility.neighbourhoodName);
    return facilities.filter((facility) => facility.neighbourhoodName === hood);
  }, [facilities, hood]);

  // Offered only when the city HAS neighbourhoods — a lone "All" dropdown would
  // be noise. The "no neighbourhood" option appears only when such rows exist,
  // so it is never an empty choice.
  const hasUnfiled = facilities.some((facility) => !facility.neighbourhoodName);
  const options = [
    { value: 'all', label: t('region.detail.facilities.allHoods') },
    ...(neighbourhoods ?? []).map((n) => ({ value: n.name, label: n.name })),
    ...(hasUnfiled ? [{ value: NONE, label: t('region.detail.facilities.noHood') }] : []),
  ];

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
            onClick={(event) => {
              event.stopPropagation();
              navigate(`${PATHS.ownerManagement}/${facility.ownerId}`);
            }}
            aria-label={t('region.detail.facilities.viewOwner', { name: facility.ownerName })}
            data-testid={`region-facility-owner-${facility.id}`}
          >
            {facility.ownerName}
          </button>
        ),
      },
      {
        key: 'neighbourhood',
        header: t('region.hood.column'),
        render: (facility) =>
          facility.neighbourhoodName ? (
            <span>{facility.neighbourhoodName}</span>
          ) : (
            // An em dash, not a blank: "filed under no neighbourhood" is a real
            // state and the operator should be able to see it at a glance.
            <span className={styles.muted}>—</span>
          ),
      },
      {
        key: 'kind',
        header: t('facility.col.kind'),
        render: (facility) => (
          <Badge variant="neutral">{t(`facility.kind.${facility.kind}`)}</Badge>
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
    <Card className={styles.card} data-testid="region-detail-facilities">
      <div className={styles.head}>
        <h2 className={styles.title}>
          {t('region.detail.sections.facilities')}
          <span className={styles.count}>
            {hood === 'all' ? facilities.length : `${visible.length}/${facilities.length}`}
          </span>
        </h2>
        {options.length > 1 && (
          <FilterField label={t('region.hood.title')} icon={<MapPinIcon />}>
            <Select
              aria-label={t('region.hood.title')}
              value={hood}
              onChange={setHood}
              options={options}
              data-testid="region-facility-hood-filter"
            />
          </FilterField>
        )}
      </div>

      <DataTable<RegionFacility>
        columns={columns}
        data={visible}
        isLoading={isLoading}
        getRowId={(facility) => facility.id}
        onRowClick={(facility) => navigate(`${PATHS.facilityManagement}/${facility.id}`)}
        emptyState={
          <EmptyState
            icon={<InboxIcon />}
            title={t(
              hood === 'all'
                ? 'region.detail.facilities.empty'
                : 'region.detail.facilities.emptyFiltered',
            )}
          />
        }
        rowActions={(facility) => (
          <IconButton
            size="sm"
            variant="ghost"
            label={t('region.detail.facilities.view')}
            icon={<EyeIcon />}
            onClick={() => navigate(`${PATHS.facilityManagement}/${facility.id}`)}
            data-testid={`region-facility-view-${facility.id}`}
          />
        )}
      />
    </Card>
  );
}
