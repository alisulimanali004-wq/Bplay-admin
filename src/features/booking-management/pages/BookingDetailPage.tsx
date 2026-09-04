import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  PageContainer,
  PageHeader,
  Spinner,
  EmptyState,
  ErrorState,
  RegionTag,
  InboxIcon,
  CalendarIcon,
  ClockIcon,
  BuildingIcon,
  StadiumIcon,
  PhoneIcon,
  UserIcon,
  UserCell,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useAuthRole } from '@shared/stores/authStore';
import { getPlayerById } from '@features/player-management/api';
import { useBookingQuery } from '../hooks/useBookingQuery';
import { useFacilityScopeQuery } from '../hooks/useFacilityScopeQuery';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { BookingSourceBadge } from '../components/BookingSourceBadge';
import { BookingTimeline } from '../components/BookingTimeline';
import type { Booking } from '../api/booking.types';
import styles from './BookingDetailPage.module.css';

const NOT_FOUND_MESSAGE = 'Booking not found';

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t } = useTranslation();
  const { data: booking, isLoading, isError, error, refetch } = useBookingQuery(bookingId);

  const notFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !booking);

  return (
    <PageContainer>
      <PageHeader
        title={booking ? booking.reference : t('booking.title')}
        subtitle={t('booking.subtitle')}
        showBack
        backLabel={t('common.back')}
      />

      {isLoading ? (
        <div className={styles.center}>
          <Spinner size="lg" />
        </div>
      ) : notFound ? (
        <EmptyState icon={<InboxIcon />} title={t('booking.empty.title')} />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : booking ? (
        <BookingDetailContent booking={booking} />
      ) : null}
    </PageContainer>
  );
}

function BookingDetailContent({ booking }: { booking: Booking }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  // Region membership isn't carried on the booking; read it from the facility
  // scope index (one scoped facilities pull, shared-cached) instead of refetching
  // the bookings list.
  const { data: scope } = useFacilityScopeQuery();
  const regionSample = scope
    ? { regionNames: scope.regionNamesById.get(booking.facilityId) ?? [], isOrphan: scope.isOrphanById.get(booking.facilityId) ?? true }
    : undefined;

  const dateLabel = new Date(booking.date).toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = `${booking.startTime}–${booking.endTime}`;

  const money = booking.money;

  return (
    <div className={styles.page}>
      {/* 1 — hero */}
      <Card padding="lg" className={styles.hero} data-testid="booking-hero">
        <div className={styles.heroBadges}>
          <BookingStatusBadge status={booking.status} />
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingSourceBadge source={booking.source} />
        </div>
        <div className={styles.heroTotal}>
          <span className={styles.heroValue}>{nf.format(money.totalSyp)}</span>
          <span className={styles.heroCurrency}>{t('booking.currency')}</span>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.metaItem}>
            <CalendarIcon className={styles.metaIcon} aria-hidden />
            <span>{dateLabel}</span>
          </span>
          <span className={styles.metaItem}>
            <ClockIcon className={styles.metaIcon} aria-hidden />
            <span dir="ltr">{timeLabel}</span>
          </span>
          <span className={styles.metaItem} title={t('booking.detail.duration')}>
            <ClockIcon className={styles.metaIcon} aria-hidden />
            <span>{t('booking.detail.hours', { n: booking.durationHours })}</span>
          </span>
        </div>
      </Card>

      <div className={styles.grid}>
        {/* 2 — party */}
        <Card padding="lg" className={styles.card} data-testid="booking-party-card">
          <h2 className={styles.cardTitle}>{t('booking.detail.party')}</h2>
          {booking.source === 'private' ? (
            <div className={styles.stack}>
              <div className={styles.partyHead}>
                <span className={styles.partyName}>{booking.blockTitle}</span>
                <Badge variant="caution" size="sm">
                  {t('booking.party.block')}
                </Badge>
              </div>
              {booking.blockReason && (
                <span className={styles.muted}>{t(`booking.blockReason.${booking.blockReason}`)}</span>
              )}
            </div>
          ) : booking.playerId ? (
            <PlayerReputation playerId={booking.playerId} name={booking.playerName ?? ''} />
          ) : booking.guest ? (
            <div className={styles.stack}>
              <div className={styles.partyHead}>
                <span className={styles.partyName}>{booking.guest.name}</span>
                <Badge variant="neutral" size="sm">
                  {t('booking.party.guest')}
                </Badge>
              </div>
              <span className={styles.phone}>
                <PhoneIcon className={styles.metaIcon} aria-hidden />
                <span dir="ltr">{booking.guest.phone}</span>
              </span>
            </div>
          ) : null}
        </Card>

        {/* 3 — facility & court */}
        <Card padding="lg" className={styles.card} data-testid="booking-facility-card">
          <h2 className={styles.cardTitle}>{t('booking.detail.facility')}</h2>
          <div className={styles.stack}>
            <div className={styles.partyHead}>
              <span className={styles.kindGlyph} aria-label={t(`booking.facilityKind.${booking.facilityKind}`)}>
                {booking.facilityKind === 'club' ? <BuildingIcon /> : <StadiumIcon />}
              </span>
              <span className={styles.partyName}>{booking.facilityName}</span>
            </div>
            {booking.courtName && (
              <div className={styles.row}>
                <span className={styles.label}>{t('booking.detail.court')}</span>
                <span className={styles.value}>{booking.courtName}</span>
              </div>
            )}
            {regionSample && (
              <RegionTag regionNames={regionSample.regionNames} isOrphan={regionSample.isOrphan} />
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<BuildingIcon />}
              onClick={() => navigate(`${PATHS.facilityManagement}/${booking.facilityId}`)}
              data-testid="booking-view-facility"
            >
              {t('booking.detail.viewFacility')}
            </Button>
          </div>
        </Card>

        {/* 4 — money */}
        <Card padding="lg" className={styles.card} data-testid="booking-money-card">
          <h2 className={styles.cardTitle}>{t('booking.detail.money')}</h2>
          <div className={styles.rows}>
            <MoneyRow label={t('booking.detail.applied')} value={`${nf.format(money.appliedPriceSyp)} ${t('booking.currency')}`} />
            <MoneyRow label={t('booking.detail.fees')} value={`${nf.format(money.feesSyp)} ${t('booking.currency')}`} />
            <MoneyRow label={t('booking.detail.tax')} value={`${nf.format(money.taxSyp)} ${t('booking.currency')}`} />
            <MoneyRow label={t('booking.detail.total')} value={`${nf.format(money.totalSyp)} ${t('booking.currency')}`} strong />
          </div>
        </Card>

        {/* 5 — check-in */}
        <Card padding="lg" className={styles.card} data-testid="booking-checkin-card">
          <h2 className={styles.cardTitle}>{t('booking.detail.checkIn')}</h2>
          {booking.checkIn ? (
            <div className={styles.rows}>
              <div className={styles.row}>
                <span className={styles.label}>{t('booking.detail.checkInMethod')}</span>
                <span className={styles.value}>
                  {t(`booking.checkInMethod.${booking.checkIn.method}`)}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>{t('booking.detail.checkIn')}</span>
                <span className={styles.value}>
                  {new Date(booking.checkIn.checkedInAt).toLocaleString(locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.muted}>{t('booking.detail.notCheckedIn')}</p>
          )}
        </Card>

        {/* 6 — recurring */}
        {booking.recurringSeriesId && (
          <Card padding="lg" className={styles.card} data-testid="booking-recurring-card">
            <h2 className={styles.cardTitle}>{t('booking.detail.recurring')}</h2>
            <div className={styles.stack}>
              <p className={styles.muted}>{t('booking.detail.recurringNote')}</p>
              <span className={styles.code} dir="ltr">
                {booking.recurringSeriesId}
              </span>
            </div>
          </Card>
        )}

        {/* 7 — notes */}
        {booking.notes && (
          <Card padding="lg" className={styles.card} data-testid="booking-notes-card">
            <h2 className={styles.cardTitle}>{t('booking.detail.notes')}</h2>
            <p className={styles.bodyText}>{booking.notes}</p>
          </Card>
        )}
      </div>

      {/* 8 — timeline */}
      <Card padding="lg" className={styles.card} data-testid="booking-timeline-card">
        <h2 className={styles.cardTitle}>{t('booking.detail.timeline')}</h2>
        <BookingTimeline entries={booking.timeline} />
      </Card>
    </div>
  );
}

/** Live-fetched reputation for a registered player party (read-only). */
function PlayerReputation({ playerId, name }: { playerId: string; name: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Player profiles live on a super_admin-only route — only make the cell/button
  // navigate for super_admins so it never dead-ends on a redirect.
  const canViewPlayer = useAuthRole() === 'super_admin';
  const { data: player } = useQuery({
    queryKey: ['booking', 'player-reputation', playerId],
    queryFn: () => getPlayerById(playerId),
  });
  return (
    <div className={styles.stack}>
      <UserCell
        name={name}
        photoUrl={player?.photoUrl}
        onClick={canViewPlayer ? () => navigate(`${PATHS.playerManagement}/${playerId}`) : undefined}
        testId="booking-party-player"
      />
      <span className={styles.subhead}>{t('booking.detail.reputation')}</span>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.label}>{t('booking.detail.noShow')}</span>
          <span className={styles.value}>{player ? player.noShowViolations : '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t('booking.detail.rating')}</span>
          <span className={styles.value}>
            {player && typeof player.overallRating === 'number'
              ? player.overallRating.toFixed(1)
              : '—'}
          </span>
        </div>
      </div>
      {canViewPlayer && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<UserIcon />}
          onClick={() => navigate(`${PATHS.playerManagement}/${playerId}`)}
          data-testid="booking-view-player"
        >
          {t('booking.detail.viewPlayer')}
        </Button>
      )}
    </div>
  );
}

function MoneyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? `${styles.row} ${styles.rowStrong}` : styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
