import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  Card,
  Badge,
  Spinner,
  ErrorState,
  EmptyState,
  InboxIcon,
} from '@ui';
import { useDisclosure, type Disclosure } from '@shared/hooks/useDisclosure';
import { statusToBadgeVariant } from '@shared/utils/status';
import { googleMapsLink, formatLatLng } from '@shared/lib/geo';
import { FACILITY_STATUSES } from '@features/facility-management/api';
import type { FacilityStatus, RegionFacility } from '@features/facility-management/api';
import { useRegionQuery } from '../hooks/useRegionQuery';
import { useRegionFacilities } from '../hooks/useRegionFacilities';
import { RegionMapView } from '../components/RegionMapView';
import type { RegionMapFacility } from '../components/RegionMapView';
import { RegionDetailActions } from '../components/RegionDetailActions';
import { RegionAttentionCard } from '../components/RegionAttentionCard';
import { RegionStatCards } from '../components/RegionStatCards';
import { RegionStatusBreakdown } from '../components/RegionStatusBreakdown';
import { RegionAdminsCard } from '../components/RegionAdminsCard';
import { RegionFacilitiesCard } from '../components/RegionFacilitiesCard';
import { RegionNeighbourhoodsCard } from '../components/RegionNeighbourhoodsCard';
import { RegionFormModal } from '../components/RegionFormModal';
import { AssignAdminModal } from '../components/AssignAdminModal';
import type { Region } from '../api/region.types';
import styles from './RegionDetailPage.module.css';

const NOT_FOUND_MESSAGE = 'Region not found';

/**
 * The region detail page: a coverage map of the region circle + facility pins,
 * KPI stat cards, the managing admins, the facilities inside the region, and
 * every region action. The page owns the edit + assign disclosures and renders
 * both modals once — RegionDetailActions and RegionAdminsCard just call the
 * shared open handlers.
 */
export default function RegionDetailPage() {
  const { regionId } = useParams<{ regionId: string }>();
  const { t } = useTranslation();
  const { data: region, isLoading, isError, error, refetch } = useRegionQuery(regionId);

  // Disclosures for the two shared modals live at page level so both the header
  // actions and the admins card open the same instance.
  const editDisclosure = useDisclosure();
  const assignDisclosure = useDisclosure();

  const notFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !region);

  return (
    <PageContainer>
      <PageHeader
        title={region ? region.name : t('region.title')}
        subtitle={t('region.detail.subtitle')}
        showBack
        backLabel={t('common.back')}
        actions={
          region ? (
            <RegionDetailActions
              region={region}
              onEdit={editDisclosure.open}
              onAssign={assignDisclosure.open}
            />
          ) : undefined
        }
      />

      {isLoading ? (
        <div className={styles.center}>
          <Spinner size="lg" />
        </div>
      ) : notFound ? (
        <EmptyState icon={<InboxIcon />} title={t('region.detail.notFound')} />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : region ? (
        <RegionDetailContent
          region={region}
          editDisclosure={editDisclosure}
          assignDisclosure={assignDisclosure}
        />
      ) : null}
    </PageContainer>
  );
}

interface ContentProps {
  region: Region;
  editDisclosure: Disclosure;
  assignDisclosure: Disclosure;
}

function RegionDetailContent({ region, editDisclosure, assignDisclosure }: ContentProps) {
  const { t, i18n } = useTranslation();
  const { data: facilities, isLoading: facilitiesLoading } = useRegionFacilities(region);

  const list = useMemo<RegionFacility[]>(() => facilities ?? [], [facilities]);

  const statusLabels = useMemo(
    () =>
      FACILITY_STATUSES.reduce(
        (acc, status) => {
          acc[status] = t(`status.${status}`);
          return acc;
        },
        {} as Record<FacilityStatus, string>,
      ),
    [t],
  );

  const mapFacilities = useMemo<RegionMapFacility[]>(
    () =>
      list.map((facility) => ({
        id: facility.id,
        name: facility.name,
        lat: facility.lat,
        lng: facility.lng,
        status: facility.status,
      })),
    [list],
  );

  const dateLocale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const createdLabel = region.createdAt
    ? new Date(region.createdAt).toLocaleDateString(dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className={styles.page}>
      {/* Identity / status strip */}
      <Card className={styles.hero} data-testid="region-detail-hero">
        {region.isDeleted ? (
          <Badge variant="danger">{t('region.deletedTag')}</Badge>
        ) : (
          <Badge variant={statusToBadgeVariant(region.status)}>
            {t(`region.status.${region.status}`)}
          </Badge>
        )}
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('region.detail.coordinates')}</span>
          <a
            className={styles.coordLink}
            href={googleMapsLink(region.centerLat, region.centerLng)}
            target="_blank"
            rel="noreferrer"
            dir="ltr"
          >
            {formatLatLng(region.centerLat, region.centerLng)}
          </a>
          <span className={styles.dot} aria-hidden>
            ·
          </span>
          <span>{t('region.form.radiusKm', { km: region.radiusKm })}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('region.detail.coverage')}</span>
          <span>
            {t('region.detail.coverageValue', {
              km2: Math.round(Math.PI * region.radiusKm * region.radiusKm),
            })}
          </span>
        </span>
        {createdLabel && (
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>{t('region.detail.createdAt')}</span>
            <span>{createdLabel}</span>
          </span>
        )}
      </Card>

      <RegionAttentionCard region={region} facilities={list} onManage={assignDisclosure.open} />

      <section className={styles.section} data-testid="region-detail-map">
        <h2 className={styles.sectionTitle}>{t('region.detail.sections.map')}</h2>
        <RegionMapView
          center={{ lat: region.centerLat, lng: region.centerLng }}
          radiusKm={region.radiusKm}
          facilities={mapFacilities}
          statusLabels={statusLabels}
          emptyLabel={t('region.detail.map.empty')}
        />
      </section>

      <RegionStatCards region={region} facilities={list} />

      <RegionStatusBreakdown facilities={list} />

      <RegionAdminsCard region={region} onManage={assignDisclosure.open} />
      <RegionNeighbourhoodsCard city={region} />
      <RegionFacilitiesCard region={region} facilities={list} isLoading={facilitiesLoading} />

      <RegionFormModal isOpen={editDisclosure.isOpen} onClose={editDisclosure.close} region={region} />
      <AssignAdminModal
        isOpen={assignDisclosure.isOpen}
        onClose={assignDisclosure.close}
        region={region}
      />
    </div>
  );
}
