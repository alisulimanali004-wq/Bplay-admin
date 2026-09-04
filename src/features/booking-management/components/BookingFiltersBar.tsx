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
  clsx,
  CalendarIcon,
  CreditCardIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
  StadiumIcon,
  TrophyIcon,
  EMPTY_DATE_RANGE,
  isDateRangeActive,
} from '@ui';
import { useAdminScope } from '../hooks/useAdminScope';
import { useScopeRegionsQuery } from '../hooks/useScopeRegionsQuery';
import { useFacilitiesForPicker } from '../hooks/useFacilitiesForPicker';
import {
  BOOKING_SOURCES,
  BOOKING_SPORTS,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  type BookingListParams,
} from '../api/booking.types';
import styles from './BookingFiltersBar.module.css';

export interface BookingFiltersBarProps {
  params: BookingListParams;
  /** Merge the patch into the params (the page also resets page to 1). */
  onChange: (patch: Partial<BookingListParams>) => void;
}

const CLEARED: Partial<BookingListParams> = {
  status: 'all',
  paymentStatus: 'all',
  facilityId: 'all',
  sport: 'all',
  source: 'all',
  regionId: 'all',
  dateRange: EMPTY_DATE_RANGE,
};

const STATUS_CHIPS = ['all', ...BOOKING_STATUSES] as const;

function isSet(value: string | undefined): boolean {
  return Boolean(value) && value !== 'all';
}

/**
 * The directory's filter strip: an always-visible search + status quick-chips
 * row, plus a collapsible glass panel of secondary filters (payment / facility /
 * sport / source / region / date). Region options are scope-aware and carry the
 * region NAME as their value (the filter matches by name). The trigger shows a
 * count of active panel filters; Clear resets everything (search text stays).
 */
export function BookingFiltersBar({ params, onChange }: BookingFiltersBarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { isSuperAdmin, assignedRegionIds } = useAdminScope();
  const regionsQuery = useScopeRegionsQuery();
  const facilitiesQuery = useFacilitiesForPicker();

  const status = params.status ?? 'all';

  const panelActiveCount =
    [params.paymentStatus, params.facilityId, params.sport, params.source, params.regionId].filter(
      isSet,
    ).length + (params.dateRange && isDateRangeActive(params.dateRange) ? 1 : 0);

  const hasAnyFilter = panelActiveCount > 0 || status !== 'all';

  const allOption = { value: 'all', label: t('booking.filters.all') };
  const scopedRegions = (regionsQuery.data ?? []).filter(
    (region) =>
      !assignedRegionIds || assignedRegionIds.length === 0 || assignedRegionIds.includes(region.id),
  );
  const regionOptions = [
    allOption,
    ...scopedRegions.map((region) => ({ value: region.name, label: region.name })),
    ...(isSuperAdmin ? [{ value: 'orphans', label: t('booking.filters.orphansOption') }] : []),
  ];

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <div className={styles.search}>
          <FilterField label={t('common.search')} icon={<SearchIcon />}>
            <SearchInput
              value={params.q ?? ''}
              onChange={(q) => onChange({ q })}
              placeholder={t('booking.search')}
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
          data-testid="booking-filters-toggle"
        >
          {t('booking.filters.trigger')}
        </Button>
        {hasAnyFilter && (
          <Button variant="ghost" onClick={() => onChange(CLEARED)} data-testid="booking-filters-clear">
            {t('booking.filters.clear')}
          </Button>
        )}
      </div>

      <div className={styles.statusChips} role="group" aria-label={t('booking.filters.allStatus')}>
        {STATUS_CHIPS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            className={clsx(styles.statusChip, status === value && styles.statusChipActive)}
            onClick={() => onChange({ status: value })}
            data-testid={`booking-status-chip-${value}`}
          >
            {value === 'all' ? t('booking.filters.allStatus') : t(`booking.status.${value}`)}
          </button>
        ))}
      </div>

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
                <FilterField label={t('booking.filters.paymentStatus')} icon={<CreditCardIcon />}>
                  <Select
                    aria-label={t('booking.filters.paymentStatus')}
                    value={params.paymentStatus ?? 'all'}
                    onChange={(value) =>
                      onChange({ paymentStatus: value as BookingListParams['paymentStatus'] })
                    }
                    options={[
                      allOption,
                      ...PAYMENT_STATUSES.map((paymentStatus) => ({
                        value: paymentStatus,
                        label: t(`booking.paymentStatus.${paymentStatus}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('booking.filters.facility')} icon={<StadiumIcon />}>
                  <Select
                    aria-label={t('booking.filters.facility')}
                    value={params.facilityId ?? 'all'}
                    onChange={(value) => onChange({ facilityId: value })}
                    options={[
                      allOption,
                      ...(facilitiesQuery.data ?? []).map((facility) => ({
                        value: facility.id,
                        label: facility.name,
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('booking.filters.sport')} icon={<TrophyIcon />}>
                  <Select
                    aria-label={t('booking.filters.sport')}
                    value={params.sport ?? 'all'}
                    onChange={(value) => onChange({ sport: value as BookingListParams['sport'] })}
                    options={[
                      allOption,
                      ...BOOKING_SPORTS.map((sport) => ({
                        value: sport,
                        label: t(`booking.sport.${sport}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('booking.filters.source')} icon={<SparklesIcon />}>
                  <Select
                    aria-label={t('booking.filters.source')}
                    value={params.source ?? 'all'}
                    onChange={(value) => onChange({ source: value as BookingListParams['source'] })}
                    options={[
                      allOption,
                      ...BOOKING_SOURCES.map((source) => ({
                        value: source,
                        label: t(`booking.source.${source}`),
                      })),
                    ]}
                  />
                </FilterField>
              </div>
              <div className={styles.filter}>
                <FilterField label={t('booking.filters.region')} icon={<MapPinIcon />}>
                  <Select
                    aria-label={t('booking.filters.region')}
                    value={params.regionId ?? 'all'}
                    onChange={(value) => onChange({ regionId: value })}
                    options={regionOptions}
                  />
                </FilterField>
              </div>
              <div className={styles.filterWide}>
                <FilterField label={t('booking.filters.dateAdded')} icon={<CalendarIcon />}>
                  <DateRange
                    value={params.dateRange ?? EMPTY_DATE_RANGE}
                    onChange={(value) => onChange({ dateRange: value })}
                    ariaLabel={t('booking.filters.dateAdded')}
                    allLabel={t('booking.filters.dateAll')}
                    last7Label={t('booking.filters.date7')}
                    last30Label={t('booking.filters.date30')}
                    last90Label={t('booking.filters.date90')}
                    customLabel={t('booking.filters.dateCustom')}
                    fromLabel={t('booking.filters.dateFrom')}
                    toLabel={t('booking.filters.dateTo')}
                    testId="booking-filter-date"
                  />
                </FilterField>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
