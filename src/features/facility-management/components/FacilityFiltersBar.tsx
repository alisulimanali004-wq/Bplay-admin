import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  DateRange,
  FilterField,
  FilterIcon,
  SearchInput,
  Select,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  GlobeIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
  StadiumIcon,
  StarIcon,
  TrophyIcon,
  clsx,
  EMPTY_DATE_RANGE,
  isDateRangeActive,
} from '@ui';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeNeighbourhoodsQuery, useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import { useOwnersForPicker } from '../hooks/useOwnersForPicker';
import {
  FACILITY_AMENITIES,
  FACILITY_KINDS,
  FACILITY_SOURCES,
  FACILITY_STATUSES,
  FACILITY_VERIFICATIONS,
  SPORT_TYPES,
  SYRIAN_GOVERNORATES,
  type FacilityAmenity,
  type FacilityListParams,
} from '../api/facility.types';
import styles from './FacilityFiltersBar.module.css';

export interface FacilityFiltersBarProps {
  params: FacilityListParams;
  /** Merge the patch into the params (the page also resets page to 1). */
  onChange: (patch: Partial<FacilityListParams>) => void;
  /** Hide the status quick-chips row — the pending queue is status-locked. */
  hideStatus?: boolean;
}

const CLEARED: Partial<FacilityListParams> = {
  status: 'all',
  kind: 'all',
  source: 'all',
  sport: 'all',
  regionId: 'all',
  ownerId: 'all',
  minRating: undefined,
  governorate: 'all',
  city: '',
  verification: 'all',
  amenities: [],
  dateRange: EMPTY_DATE_RANGE,
};

const STATUS_CHIPS = ['all', ...FACILITY_STATUSES] as const;

function isSet(value: string | undefined): boolean {
  return Boolean(value) && value !== 'all';
}

/**
 * The directory's filter strip: an always-visible search + status quick-chips
 * row, plus a collapsible glass panel of secondary filters (kind / sport /
 * region / owner / rating / governorate / city / verification / date / amenities).
 * Region options are scope-aware; the trigger carries a count of active panel
 * filters; Clear resets everything (search text stays).
 */
export function FacilityFiltersBar({
  params,
  onChange,
  hideStatus = false,
}: FacilityFiltersBarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { isSuperAdmin, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();
  const neighbourhoodsQuery = useScopeNeighbourhoodsQuery();
  const ownersQuery = useOwnersForPicker();

  const status = params.status ?? 'all';
  const amenities = params.amenities ?? [];

  const panelActiveCount =
    [
      params.kind,
      params.source,
      params.sport,
      params.regionId,
      params.ownerId,
      params.governorate,
      params.verification,
    ].filter(isSet).length +
    (typeof params.minRating === 'number' ? 1 : 0) +
    ((params.city ?? '').trim() ? 1 : 0) +
    (amenities.length > 0 ? 1 : 0) +
    (params.dateRange && isDateRangeActive(params.dateRange) ? 1 : 0);

  const hasAnyFilter = panelActiveCount > 0 || status !== 'all';

  const allOption = { value: 'all', label: t('facility.filters.all') };
  const scopedRegions = (regionsQuery.data ?? []).filter(
    (region) =>
      !assignedRegionIds || assignedRegionIds.length === 0 || assignedRegionIds.includes(region.id),
  );
  // Each city, then its own neighbourhoods indented beneath it. Both are valid
  // `regionId` values — the API matches `city_id = $1 OR neighbourhood_id = $1`
  // — so a neighbourhood filters to just that neighbourhood, and its city to
  // the whole city. Cities with nothing under them stay ungrouped, which keeps
  // the list flat wherever no neighbourhoods are drawn.
  const scopedNeighbourhoods = (neighbourhoodsQuery.data ?? []).filter((n) =>
    scopedRegions.some((region) => region.id === n.cityId),
  );
  const regionOptions = [
    allOption,
    ...scopedRegions.flatMap((region) => [
      { value: region.id, label: region.name },
      ...scopedNeighbourhoods
        .filter((n) => n.cityId === region.id)
        .map((n) => ({ value: n.id, label: n.name, indent: true })),
    ]),
    ...(isSuperAdmin ? [{ value: 'orphans', label: t('facility.filters.orphansOption') }] : []),
  ];

  const toggleAmenity = (amenity: FacilityAmenity) => {
    const next = amenities.includes(amenity)
      ? amenities.filter((item) => item !== amenity)
      : [...amenities, amenity];
    onChange({ amenities: next });
  };

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <div className={styles.search}>
          <FilterField label={t('common.search')} icon={<SearchIcon />}>
            <SearchInput
              value={params.q ?? ''}
              onChange={(q) => onChange({ q })}
              placeholder={t('facility.search')}
            />
          </FilterField>
        </div>
        <Button
          variant="secondary"
          leftIcon={<FilterIcon />}
          rightIcon={
            panelActiveCount > 0 ? (
              <Badge variant="info" size="sm">
                {panelActiveCount}
              </Badge>
            ) : undefined
          }
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          data-testid="facility-filters-toggle"
        >
          {t('facility.filters.trigger')}
        </Button>
        {hasAnyFilter && (
          <Button
            variant="ghost"
            onClick={() => onChange(CLEARED)}
            data-testid="facility-filters-clear"
          >
            {t('facility.filters.clear')}
          </Button>
        )}
      </div>

      {!hideStatus && (
        <div className={styles.statusChips} role="group" aria-label={t('facility.filters.status')}>
          {STATUS_CHIPS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              className={clsx(styles.statusChip, status === value && styles.statusChipActive)}
              onClick={() => onChange({ status: value })}
              data-testid={`facility-status-chip-${value}`}
            >
              {value === 'all' ? t('facility.filters.allStatus') : t(`status.${value}`)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.collapse}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
          >
            <div className={styles.panel}>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.kind')} icon={<StadiumIcon />}>
                  <Select
                    aria-label={t('facility.filters.kind')}
                    value={params.kind ?? 'all'}
                    onChange={(value) => onChange({ kind: value as FacilityListParams['kind'] })}
                    options={[
                      allOption,
                      ...FACILITY_KINDS.map((kind) => ({
                        value: kind,
                        label: t(`facility.kind.${kind}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.source')} icon={<SparklesIcon />}>
                  <Select
                    aria-label={t('facility.filters.source')}
                    value={params.source ?? 'all'}
                    onChange={(value) => onChange({ source: value as FacilityListParams['source'] })}
                    options={[
                      allOption,
                      ...FACILITY_SOURCES.map((source) => ({
                        value: source,
                        label: t(`facility.source.${source}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.sport')} icon={<TrophyIcon />}>
                  <Select
                    aria-label={t('facility.filters.sport')}
                    value={params.sport ?? 'all'}
                    onChange={(value) => onChange({ sport: value as FacilityListParams['sport'] })}
                    options={[
                      allOption,
                      ...SPORT_TYPES.map((sport) => ({
                        value: sport,
                        label: t(`facility.sport.${sport}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.region')} icon={<MapPinIcon />}>
                  <Select
                    aria-label={t('facility.filters.region')}
                    value={params.regionId ?? 'all'}
                    onChange={(value) => onChange({ regionId: value })}
                    options={regionOptions}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.owner')} icon={<BuildingIcon />}>
                  <Select
                    aria-label={t('facility.filters.owner')}
                    value={params.ownerId ?? 'all'}
                    onChange={(value) => onChange({ ownerId: value })}
                    options={[
                      allOption,
                      ...(ownersQuery.data ?? []).map((owner) => ({
                        value: owner.id,
                        label: owner.name,
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.governorate')} icon={<GlobeIcon />}>
                  <Select
                    aria-label={t('facility.filters.governorate')}
                    value={params.governorate ?? 'all'}
                    onChange={(value) =>
                      onChange({ governorate: value as FacilityListParams['governorate'] })
                    }
                    options={[
                      allOption,
                      ...SYRIAN_GOVERNORATES.map((governorate) => ({
                        value: governorate,
                        label: t(`facility.governorate.${governorate}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.city')} icon={<MapPinIcon />}>
                  <SearchInput
                    value={params.city ?? ''}
                    onChange={(city) => onChange({ city })}
                    placeholder={t('facility.filters.cityPlaceholder')}
                    ariaLabel={t('facility.filters.city')}
                    testId="facility-filter-city"
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.verification')} icon={<CheckIcon />}>
                  <Select
                    aria-label={t('facility.filters.verification')}
                    value={params.verification ?? 'all'}
                    onChange={(value) =>
                      onChange({ verification: value as FacilityListParams['verification'] })
                    }
                    options={[
                      allOption,
                      ...FACILITY_VERIFICATIONS.map((verification) => ({
                        value: verification,
                        label: t(`facility.verification.${verification}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('facility.filters.rating')} icon={<StarIcon />}>
                  <Select
                    aria-label={t('facility.filters.rating')}
                    value={typeof params.minRating === 'number' ? String(params.minRating) : 'any'}
                    onChange={(value) =>
                      onChange({ minRating: value === 'any' ? undefined : Number(value) })
                    }
                    options={[
                      { value: 'any', label: t('facility.filters.ratingAny') },
                      { value: '3', label: t('facility.filters.rating3') },
                      { value: '4', label: t('facility.filters.rating4') },
                      { value: '4.5', label: t('facility.filters.rating45') },
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filterWide}>
                <FilterField label={t('facility.filters.dateAdded')} icon={<CalendarIcon />}>
                  <DateRange
                    value={params.dateRange ?? EMPTY_DATE_RANGE}
                    onChange={(value) => onChange({ dateRange: value })}
                    ariaLabel={t('facility.filters.dateAdded')}
                    allLabel={t('facility.filters.dateAll')}
                    last7Label={t('facility.filters.date7')}
                    last30Label={t('facility.filters.date30')}
                    last90Label={t('facility.filters.date90')}
                    customLabel={t('facility.filters.dateCustom')}
                    fromLabel={t('facility.filters.dateFrom')}
                    toLabel={t('facility.filters.dateTo')}
                    testId="facility-filter-date"
                  />
                </FilterField>
              </div>

              <div className={styles.amenities} role="group" aria-label={t('facility.filters.amenities')}>
                <span className={styles.amenitiesLabel}>{t('facility.filters.amenities')}</span>
                <div className={styles.amenityChips}>
                  {FACILITY_AMENITIES.map((amenity) => {
                    const active = amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        aria-pressed={active}
                        className={clsx(styles.amenityChip, active && styles.amenityChipActive)}
                        onClick={() => toggleAmenity(amenity)}
                        data-testid={`facility-amenity-${amenity}`}
                      >
                        {t(`facility.amenity.${amenity}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
