import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PageContainer,
  PageHeader,
  Card,
  Button,
  Avatar,
  Alert,
  Badge,
  Tabs,
  StatCard,
  RatingStars,
  Skeleton,
  SkeletonText,
  ErrorState,
  EmptyState,
  ImageLightbox,
  MapView,
  MapPinIcon,
  PhoneIcon,
  StadiumIcon,
  EditIcon,
  TrashIcon,
  ChevronEndIcon,
  ConfirmDialog,
  Thumb,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useAuthRole } from '@shared/stores/authStore';
import { useFacilityQuery } from '../hooks/useFacilityQuery';
import { useDeleteFacility } from '../hooks/useDeleteFacility';
import { FacilityStatusActions } from '../components/FacilityStatusActions';
import { FacilityStatusBadge } from '../components/FacilityStatusBadge';
import { WorkingHoursView } from '../components/WorkingHoursView';
import { PitchSpecsGrid } from '../components/PitchSpecsGrid';
import { CourtCard } from '../components/CourtCard';
import { FacilityDocumentsCard } from '../components/FacilityDocumentsCard';
import { FacilityMediaManager } from '../components/FacilityMediaManager';
import { FacilitySourceBadge } from '../components/FacilitySourceBadge';
import { canEditFacility, type Facility } from '../api/facility.types';
import styles from './FacilityProfilePage.module.css';

type ProfileTab = 'overview' | 'courts' | 'media';

export default function FacilityProfilePage() {
  const { facilityId } = useParams<{ facilityId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: facility, isLoading, isError, error, refetch } = useFacilityQuery(facilityId);
  const deleteMutation = useDeleteFacility();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const notFound = isError && error instanceof Error && error.message === 'Facility not found';

  // Only navigate away once the delete actually succeeded — the backend refuses
  // while upcoming bookings exist, and leaving the page on a rejected delete
  // would hide the explanation the admin needs.
  const onDeleteConfirmed = () => {
    if (!facility) return;
    deleteMutation.mutate(facility.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        navigate(PATHS.facilityManagement);
      },
      onError: () => setConfirmDelete(false),
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('facility.profile.title')}
        subtitle={t('facility.profile.subtitle')}
        showBack
        backLabel={t('common.back')}
        actions={
          facility ? (
            <>
              {canEditFacility(facility.source) && (
                <Button
                  variant="secondary"
                  leftIcon={<EditIcon />}
                  onClick={() => navigate(`${PATHS.facilityManagement}/${facility.id}/edit`)}
                  data-testid="facility-edit"
                >
                  {t('facility.profile.edit')}
                </Button>
              )}
              <FacilityStatusActions facility={facility} />
              <Button
                variant="danger"
                leftIcon={<TrashIcon />}
                onClick={() => setConfirmDelete(true)}
                data-testid="facility-delete"
              >
                {t('facility.profile.delete')}
              </Button>
            </>
          ) : undefined
        }
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDeleteConfirmed}
        title={t('facility.profile.deleteTitle')}
        message={t('facility.profile.deleteMessage', { name: facility?.name ?? '' })}
        confirmText={t('facility.profile.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {isLoading ? (
        <FacilityProfileSkeleton />
      ) : notFound ? (
        <EmptyState icon={<StadiumIcon />} title={t('facility.profile.notFound')} />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : !facility ? (
        <EmptyState icon={<StadiumIcon />} title={t('facility.profile.notFound')} />
      ) : (
        <FacilityProfile facility={facility} />
      )}
    </PageContainer>
  );
}

/** Hero-shaped loading placeholder: cover block, stat tiles, two content cards. */
function FacilityProfileSkeleton() {
  return (
    <div className={styles.profile} aria-busy="true">
      <Skeleton height="240px" radius="var(--radius-2xl)" />
      <div className={styles.stats}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} height="88px" radius="var(--radius-xl)" />
        ))}
      </div>
      <div className={styles.overviewGrid}>
        <Card className={styles.card}>
          <SkeletonText lines={4} />
        </Card>
        <Card className={styles.card}>
          <SkeletonText lines={4} />
        </Card>
      </div>
    </div>
  );
}

function FacilityProfile({ facility }: { facility: Facility }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Owner profiles live on a super_admin-only route — only super_admins can open them.
  const canViewOwner = useAuthRole() === 'super_admin';
  const editPath = `${PATHS.facilityManagement}/${facility.id}/edit`;
  const hasCoordinates =
    Number.isFinite(facility.location.lat) && Number.isFinite(facility.location.lng);

  const numberLocale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  // The owner's chosen hero image wins; the first gallery photo is the fallback.
  // `coverUrl` was on the wire and previously ignored, so a facility with a cover
  // set still showed whatever happened to be first in its gallery.
  const cover = facility.coverUrl ?? facility.images[0];

  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(numberLocale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—';

  // A club carries a list of disciplines; a pitch has exactly one.
  const sportsList = facility.kind === 'club' ? facility.sports : [facility.sport];
  const socialEntries = Object.entries(facility.socialLinks ?? {}).filter(
    ([, url]) => typeof url === 'string' && url.length > 0,
  );

  const locationLine =
    [
      facility.location.governorate
        ? t(`facility.governorate.${facility.location.governorate}`)
        : undefined,
      facility.location.city,
      facility.location.district,
    ]
      .filter(Boolean)
      .join(' · ') || facility.location.address;

  return (
    <div className={styles.profile}>
      <motion.section
        className={styles.hero}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        data-testid="facility-profile-hero"
      >
        <Thumb
          src={cover}
          alt={facility.name}
          loading="eager"
          className={styles.heroImage}
          fallbackClassName={styles.heroFallback}
          fallback={<StadiumIcon />}
        />
        <div className={styles.scrim} aria-hidden />

        <motion.div
          className={styles.plate}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        >
          {facility.kind === 'club' ? (
            <Avatar src={facility.logoUrl} name={facility.name} size="lg" />
          ) : (
            <span className={styles.kindIcon} aria-hidden>
              <StadiumIcon />
            </span>
          )}
          <div className={styles.plateInfo}>
            <h2 className={styles.plateName}>{facility.name}</h2>
            <p className={styles.plateLocation}>
              <MapPinIcon className={styles.plateLocationIcon} />
              <span className={styles.plateLocationText}>{locationLine}</span>
            </p>
          </div>
          <div className={styles.plateMeta}>
            <FacilityStatusBadge status={facility.status} size="md" />
            <FacilitySourceBadge source={facility.source} size="md" />
            <span className={styles.plateRating}>
              <RatingStars value={facility.rating ?? null} size="md" />
            </span>
          </div>
        </motion.div>
      </motion.section>

      {/* These now report what the endpoint computes. Occupancy and revenue are
          NOT among them — showing a hard-coded 0 for both, as this did, reads as
          "this facility earns nothing" rather than "not measured yet". Courts
          and reviews are real numbers and take their place. */}
      <div className={styles.stats}>
        <StatCard
          label={t('facility.profile.stats.bookings')}
          value={facility.statistics.totalBookings}
          accent="primary"
          countUp
        />
        <StatCard
          label={t('facility.profile.stats.reviews')}
          value={facility.statistics.reviewCount}
          accent="info"
          countUp
        />
        <StatCard
          label={t('facility.profile.stats.courts')}
          value={facility.kind === 'club' ? facility.courts.length : 1}
          accent="secondary"
          countUp
        />
        <StatCard
          label={t('facility.profile.stats.rating')}
          value={
            facility.statistics.avgRating > 0
              ? facility.statistics.avgRating.toFixed(1)
              : typeof facility.rating === 'number'
                ? facility.rating.toFixed(1)
                : '—'
          }
          accent="warning"
        />
      </div>

      <Tabs
        items={[
          { key: 'overview', label: t('facility.profile.tabs.overview') },
          { key: 'courts', label: t('facility.profile.tabs.courts') },
          { key: 'media', label: t('facility.profile.tabs.media') },
        ]}
        value={tab}
        onChange={(key) => setTab(key as ProfileTab)}
        aria-label={t('facility.profile.title')}
      />

      {tab === 'overview' && (
        <div className={styles.tabPanel} role="tabpanel" aria-label={t('facility.profile.tabs.overview')}>
          {facility.status === 'rejected' && (
            <Alert variant="error" title={t('facility.profile.rejectionReason')}>
              {facility.adminNotes}
            </Alert>
          )}
          {facility.status === 'suspended' && (
            <Alert variant="error" title={t('facility.profile.suspensionReason')}>
              {facility.suspensionReason}
            </Alert>
          )}
          {facility.status === 'owner_suspended' && (
            <Alert variant="info">{t('facility.profile.ownerPausedNote')}</Alert>
          )}

          <div className={styles.overviewGrid}>
            {/* MAIN column — what the facility offers. */}
            <div className={styles.overviewMain}>
            <Card className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('facility.profile.description')}</h2>
              {/* Not gated on `kind === 'club'`: the endpoint returns a
                  description for a pitch too, and gating it here meant a pitch
                  always rendered the "no description" placeholder even when one
                  had been written. */}
              {facility.description ? (
                <p className={styles.description}>{facility.description}</p>
              ) : (
                <p className={styles.muted}>{t('facility.profile.noDescription')}</p>
              )}
              {facility.kind === 'club' && facility.contactPhone && (
                <div className={styles.contact}>
                  <PhoneIcon className={styles.contactIcon} />
                  <span className={styles.contactLabel}>{t('facility.profile.contact')}</span>
                  <span className={styles.contactValue}>{facility.contactPhone}</span>
                </div>
              )}

              {/* The sports on offer. Returned by the endpoint for every
                  facility but never rendered anywhere before, so a club's
                  whole discipline list was invisible on its own profile. */}
              {sportsList.length > 0 && (
                <div className={styles.sports}>
                  <span className={styles.label}>{t('facility.profile.sports')}</span>
                  <span className={styles.chips}>
                    {sportsList.map((sport) => (
                      <Badge key={sport} variant="neutral" size="sm">
                        {t(`facility.sport.${sport}`, { defaultValue: sport })}
                      </Badge>
                    ))}
                  </span>
                </div>
              )}
            </Card>

            {facility.kind === 'club' ? (
              <Card className={styles.card}>
                <h2 className={styles.sectionTitle}>{t('facility.profile.workingHours')}</h2>
                <WorkingHoursView workingHours={facility.workingHours} />
              </Card>
            ) : (
              <Card className={styles.card}>
                <h2 className={styles.sectionTitle}>{t('facility.profile.specs')}</h2>
                <PitchSpecsGrid
                  specs={facility.specs}
                  pricePerHour={facility.pricePerHour}
                  capacity={facility.capacity}
                  cancelPolicy={facility.cancelPolicy}
                />
              </Card>
            )}
            </div>

            {/* SIDE column — reference data: who and where. */}
            <div className={styles.overviewSide}>
            <Card className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('facility.profile.location')}</h2>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.profile.address')}</span>
                  <span className={styles.value}>{facility.location.address || '—'}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.wizard.location.city')}</span>
                  <span className={styles.value}>{facility.location.city || '—'}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.wizard.location.district')}</span>
                  <span className={styles.value}>{facility.location.district || '—'}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.wizard.location.governorate')}</span>
                  <span className={styles.value}>
                    {facility.location.governorate
                      ? t(`facility.governorate.${facility.location.governorate}`)
                      : '—'}
                  </span>
                </div>
              </div>
              {/* A facility can have NO coordinates — `numOr` yields NaN, and
                  Leaflet THROWS on an invalid LatLng, which took down the whole
                  profile with "something went wrong". Half the seeded
                  facilities have a null lat/lng, so this was not an edge case. */}
              {hasCoordinates ? (
                <div className={styles.mapView}>
                  <MapView lat={facility.location.lat} lng={facility.location.lng} />
                </div>
              ) : (
                <div className={styles.mapMissing}>
                  <MapPinIcon aria-hidden />
                  <span>{t('facility.profile.noLocation')}</span>
                </div>
              )}
            </Card>

            {/* Everything else the record holds. These fields were all on the
                wire and shown nowhere, so the profile claimed to be the full
                view of a facility while omitting most of it. */}
            <Card className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('facility.profile.details')}</h2>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.profile.kind')}</span>
                  <span className={styles.value}>{t(`facility.kind.${facility.kind}`)}</span>
                </div>
                {facility.venueType && (
                  <div className={styles.row}>
                    <span className={styles.label}>{t('facility.profile.venueType')}</span>
                    <span className={styles.value}>
                      {t(`facility.types.${facility.venueType}`, {
                        defaultValue: facility.venueType,
                      })}
                    </span>
                  </div>
                )}
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.profile.owner')}</span>
                  <span className={styles.value}>{facility.ownerName || '—'}</span>
                </div>
                {facility.ownerPhone && (
                  <div className={styles.row}>
                    <span className={styles.label}>{t('facility.profile.ownerPhone')}</span>
                    <span className={styles.value} dir="ltr">
                      {facility.ownerPhone}
                    </span>
                  </div>
                )}
                {/* Live/paused is independent of the review status, so a
                    facility can be approved AND switched off. Both are shown. */}
                {facility.isActive !== undefined && (
                  <div className={styles.row}>
                    <span className={styles.label}>{t('facility.profile.activeState')}</span>
                    <span className={styles.value}>
                      <Badge variant={facility.isActive ? 'success' : 'neutral'} size="sm">
                        {t(facility.isActive ? 'facility.profile.live' : 'facility.profile.paused')}
                      </Badge>
                    </span>
                  </div>
                )}
                {facility.suspendedAt && (
                  <div className={styles.row}>
                    <span className={styles.label}>{t('facility.profile.suspendedAt')}</span>
                    <span className={styles.value}>{formatDate(facility.suspendedAt)}</span>
                  </div>
                )}
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.profile.createdAt')}</span>
                  <span className={styles.value}>{formatDate(facility.createdAt)}</span>
                </div>
                {facility.updatedAt && (
                  <div className={styles.row}>
                    <span className={styles.label}>{t('facility.profile.updatedAt')}</span>
                    <span className={styles.value}>{formatDate(facility.updatedAt)}</span>
                  </div>
                )}
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.profile.reviewCount')}</span>
                  <span className={styles.value}>{facility.statistics.reviewCount ?? 0}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>{t('facility.profile.totalBookings')}</span>
                  <span className={styles.value}>{facility.statistics.totalBookings ?? 0}</span>
                </div>
              </div>

              {socialEntries.length > 0 && (
                <div className={styles.social}>
                  <span className={styles.label}>{t('facility.profile.social')}</span>
                  <span className={styles.chips}>
                    {socialEntries.map(([network, url]) => (
                      <a
                        key={network}
                        className={styles.socialLink}
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {network}
                      </a>
                    ))}
                  </span>
                </div>
              )}
            </Card>
            </div>
          </div>
        </div>
      )}

      {tab === 'courts' && (
        <div className={styles.tabPanel} role="tabpanel" aria-label={t('facility.profile.tabs.courts')}>
          {facility.kind === 'club' ? (
            <>
              <div className={styles.courtsHead}>
                <p className={styles.courtsCount}>
                  {facility.courts.length === 0
                    ? t('facility.profile.courtsEmpty')
                    : t('facility.profile.courtsCount', { count: facility.courts.length })}
                </p>
                {canEditFacility(facility.source) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<EditIcon />}
                    onClick={() => navigate(editPath)}
                    data-testid="facility-manage-courts"
                  >
                    {t('facility.profile.manageCourts')}
                  </Button>
                )}
              </div>
              {facility.courts.length > 0 && (
                <div className={styles.courtsGrid}>
                  {facility.courts.map((court) => (
                    <CourtCard key={court.id} court={court} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card className={styles.card}>
              <p className={styles.muted}>{t('facility.profile.pitchSelf')}</p>
              <PitchSpecsGrid
                specs={facility.specs}
                pricePerHour={facility.pricePerHour}
                capacity={facility.capacity}
                cancelPolicy={facility.cancelPolicy}
              />
            </Card>
          )}
        </div>
      )}

      {tab === 'media' && (
        <div className={styles.tabPanel} role="tabpanel" aria-label={t('facility.profile.tabs.media')}>
          <Card className={styles.card}>
            <h2 className={styles.sectionTitle}>{t('facility.profile.photos')}</h2>
            {facility.images.length === 0 ? (
              <p className={styles.muted}>{t('facility.profile.noPhotos')}</p>
            ) : (
              <div className={styles.photoGrid}>
                {facility.images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={styles.photoLink}
                    onClick={() => setLightbox(image)}
                    aria-label={`${facility.name} — ${t('facility.profile.photos')} ${index + 1}`}
                    data-testid={`facility-photo-${index}`}
                  >
                    <Thumb
                      src={image}
                      className={styles.photo}
                      fallbackClassName={styles.photoFallback}
                      fallback={<StadiumIcon />}
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <FacilityDocumentsCard facilityId={facility.id} documents={facility.documents} />

          {/* Owner-submitted facilities are edited by their owner; the admin
              reviews them rather than rewriting their media. */}
          {canEditFacility(facility.source) && <FacilityMediaManager facility={facility} />}
        </div>
      )}

      <section className={styles.ownerCard} data-testid="facility-owner-card">
        {canViewOwner ? (
          <button
            type="button"
            className={styles.ownerLink}
            onClick={() => navigate(`${PATHS.ownerManagement}/${facility.ownerId}`)}
            data-testid="facility-view-owner"
            title={t('facility.profile.viewOwner')}
          >
            <Avatar src={facility.ownerPhotoUrl} name={facility.ownerName} size="md" />
            <span className={styles.ownerInfo}>
              <span className={styles.ownerLabel}>{t('facility.profile.owner')}</span>
              <span className={styles.ownerName}>{facility.ownerName}</span>
            </span>
            <ChevronEndIcon className={styles.ownerChevron} aria-hidden />
          </button>
        ) : (
          <>
            <Avatar src={facility.ownerPhotoUrl} name={facility.ownerName} size="md" />
            <div className={styles.ownerInfo}>
              <span className={styles.ownerLabel}>{t('facility.profile.owner')}</span>
              <span className={styles.ownerName}>{facility.ownerName}</span>
            </div>
          </>
        )}
      </section>

      <ImageLightbox
        isOpen={lightbox !== null}
        onClose={() => setLightbox(null)}
        src={lightbox ?? undefined}
        alt={facility.name}
        title={facility.name}
        closeLabel={t('common.close')}
        zoomInLabel={t('common.zoomIn')}
        zoomOutLabel={t('common.zoomOut')}
        resetLabel={t('common.resetZoom')}
      />
    </div>
  );
}
