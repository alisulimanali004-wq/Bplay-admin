import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  DetailHero,
  MetaItem,
  Card,
  Avatar,
  Badge,
  Button,
  Spinner,
  ErrorState,
  EmptyState,
  DataTable,
  RegionTag,
  CreditCardIcon,
  CalendarIcon,
  CheckIcon,
  InboxIcon,
  ExternalLinkIcon,
  type Column,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { statusToBadgeVariant } from '@shared/utils/status';
import { useMembershipQuery } from '../hooks/useMembershipQuery';
import { useClubScopeQuery } from '../hooks/useClubScopeQuery';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { SegmentBadges } from '../components/SegmentBadges';
import {
  computeMemberSegments,
  type Membership,
  type MembershipCheckIn,
  type MembershipPayment,
} from '../api';
import styles from './MembershipDetailPage.module.css';

const NOT_FOUND_MESSAGE = 'Membership not found';
const DAY_MS = 86_400_000;

export default function MembershipDetailPage() {
  const { membershipId } = useParams<{ membershipId: string }>();
  const { t } = useTranslation();
  const { data: membership, isLoading, isError, error, refetch } = useMembershipQuery(membershipId);

  const notFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !membership);

  return (
    <PageContainer>
      <PageHeader
        title={membership ? membership.playerName : t('membership.detail.player')}
        subtitle={
          membership ? `${membership.clubName} · ${membership.plan.name}` : t('membership.title')
        }
        showBack
        backLabel={t('common.back')}
      />

      {isLoading ? (
        <div className={styles.center}>
          <Spinner size="lg" />
        </div>
      ) : notFound ? (
        <EmptyState icon={<InboxIcon />} title={t('membership.detail.notFound')} />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : membership ? (
        <MembershipDetailContent membership={membership} />
      ) : null}
    </PageContainer>
  );
}

function MembershipDetailContent({ membership }: { membership: Membership }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: scope } = useClubScopeQuery();

  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = (value: string): string =>
    new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  const money = (value: number): string => `${nf.format(value)} ${t('membership.currency')}`;

  const nowMs = Date.now();
  const segments = computeMemberSegments(
    {
      status: membership.status,
      startDate: membership.startDate,
      endDate: membership.endDate,
      priceSyp: membership.plan.priceSyp,
    },
    nowMs,
  );
  const daysLeft = Math.floor((Date.parse(membership.endDate) - nowMs) / DAY_MS);
  const entryLimitLabel =
    membership.plan.monthlyEntryLimit === null
      ? t('membership.detail.unlimited')
      : nf.format(membership.plan.monthlyEntryLimit);

  /**
   * Entry usage, or a dash when it is not tracked.
   *
   * entriesUsed is null when the backend has no entry log to count (which is
   * currently always). Rendering that as "0 / 12" would assert the member has
   * never used their membership — a claim we cannot make and cannot be told
   * apart from a real zero. An em dash says "unknown" instead.
   */
  const entryUsageLabel =
    membership.entriesUsed === null
      ? t('membership.detail.entriesNotTracked')
      : `${nf.format(membership.entriesUsed)} / ${entryLimitLabel}`;

  const regionNames = scope?.regionNamesById.get(membership.clubId) ?? [];
  const isOrphan = scope ? (scope.isOrphanById.get(membership.clubId) ?? true) : false;

  const openPlayer = () => navigate(`${PATHS.playerManagement}/${membership.playerId}`);
  const openClub = () => navigate(`${PATHS.facilityManagement}/${membership.clubId}`);

  const paymentColumns = useMemo<Column<MembershipPayment>[]>(
    () => [
      { key: 'date', header: t('membership.detail.paymentDate'), render: (p) => fmt(p.date) },
      {
        key: 'amount',
        header: t('membership.detail.amount'),
        align: 'end',
        render: (p) => <span className={styles.mono}>{money(p.amountSyp)}</span>,
      },
      {
        key: 'method',
        header: t('membership.detail.method'),
        render: (p) => t(`membership.paymentMethod.${p.method}`),
      },
      {
        key: 'status',
        header: t('membership.detail.paymentStatus'),
        render: (p) => (
          <Badge variant={statusToBadgeVariant(p.status)} size="sm">
            {t(`membership.paymentStatus.${p.status}`)}
          </Badge>
        ),
      },
    ],
    [t, locale],
  );

  const checkInColumns = useMemo<Column<MembershipCheckIn>[]>(
    () => [
      { key: 'date', header: t('membership.detail.checkInDate'), render: (c) => fmt(c.date) },
      {
        key: 'method',
        header: t('membership.detail.checkInMethod'),
        render: (c) => t(`membership.checkInMethod.${c.method}`),
      },
    ],
    [t, locale],
  );

  return (
    <div className={styles.page}>
      <DetailHero
        name={membership.playerName}
        photoUrl={membership.playerPhotoUrl}
        testId="membership-detail-hero"
        badges={
          <>
            <MembershipStatusBadge status={membership.status} />
            <SegmentBadges segments={segments} />
          </>
        }
        meta={
          <>
            <MetaItem
              icon={<CreditCardIcon />}
              label={t('membership.detail.plan')}
              value={membership.plan.name}
            />
            <MetaItem
              icon={<CalendarIcon />}
              label={t('membership.col.period')}
              value={`${fmt(membership.startDate)} – ${fmt(membership.endDate)}`}
              ltr
            />
            <MetaItem
              icon={<CheckIcon />}
              label={t('membership.detail.entriesUsed')}
              value={entryUsageLabel}
            />
          </>
        }
      />

      <div className={styles.linkRow}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ExternalLinkIcon />}
          onClick={openPlayer}
          data-testid="membership-view-player"
        >
          {t('membership.detail.viewPlayer')}
        </Button>
      </div>

      <div className={styles.grid}>
        {/* Club & Plan */}
        <Card padding="lg" className={styles.card} data-testid="membership-club-plan-card">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t('membership.detail.club')}</h2>
          </div>

          <button
            type="button"
            className={styles.clubRow}
            onClick={openClub}
            data-testid="membership-club-link"
          >
            <Avatar src={membership.clubLogoUrl} name={membership.clubName} size="md" />
            <span className={styles.clubName}>{membership.clubName}</span>
          </button>

          {scope && <RegionTag regionNames={regionNames} isOrphan={isOrphan} />}

          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt className={styles.label}>{t('membership.detail.plan')}</dt>
              <dd className={styles.value}>{membership.plan.name}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.label}>{t('membership.detail.planType')}</dt>
              <dd className={styles.value}>{t(`membership.planType.${membership.plan.planType}`)}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.label}>{t('membership.detail.billingCycle')}</dt>
              <dd className={styles.value}>
                {t(`membership.billingCycle.${membership.plan.billingCycle}`)}
              </dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.label}>{t('membership.detail.price')}</dt>
              <dd className={styles.value}>{money(membership.plan.priceSyp)}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.label}>{t('membership.detail.duration')}</dt>
              <dd className={styles.value}>
                {nf.format(membership.plan.durationDays)} {t('membership.detail.days')}
              </dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.label}>{t('membership.detail.entryLimit')}</dt>
              <dd className={styles.value}>{entryLimitLabel}</dd>
            </div>
          </dl>

          {membership.plan.features.length > 0 && (
            <div className={styles.featuresBlock}>
              <span className={styles.label}>{t('membership.detail.features')}</span>
              <ul className={styles.features}>
                {membership.plan.features.map((feature) => (
                  <li key={feature} className={styles.feature}>
                    <CheckIcon className={styles.featureIcon} aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            variant="secondary"
            leftIcon={<ExternalLinkIcon />}
            onClick={openClub}
            data-testid="membership-view-club"
          >
            {t('membership.detail.viewClub')}
          </Button>
        </Card>

        {/* Right column: Dates + Payments stacked beside the tall plan card. */}
        <div className={styles.side}>
          <Card padding="lg" className={styles.card} data-testid="membership-dates-card">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{t('membership.detail.dates')}</h2>
            </div>
            <dl className={styles.rows}>
              <div className={styles.row}>
                <dt className={styles.label}>{t('membership.detail.start')}</dt>
                <dd className={styles.value} dir="ltr">
                  {fmt(membership.startDate)}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>{t('membership.detail.end')}</dt>
                <dd className={styles.value} dir="ltr">
                  {fmt(membership.endDate)}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>{t('membership.detail.daysLeft')}</dt>
                <dd className={styles.value}>
                  {daysLeft >= 0 ? nf.format(daysLeft) : nf.format(0)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Payments */}
          <Card padding="lg" className={styles.card} data-testid="membership-payments-card">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{t('membership.detail.payments')}</h2>
            </div>
            {membership.payments.length === 0 ? (
              <EmptyState icon={<InboxIcon />} title={t('membership.detail.noPayments')} />
            ) : (
              <DataTable<MembershipPayment>
                columns={paymentColumns}
                data={membership.payments}
                getRowId={(payment) => payment.id}
                actionsLabel={t('common.actions')}
              />
            )}
          </Card>
        </div>
      </div>

      {/* Usage */}
      <Card padding="lg" className={styles.card} data-testid="membership-usage-card">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{t('membership.detail.usage')}</h2>
          <span className={styles.usageCount}>{entryUsageLabel}</span>
        </div>
        {membership.checkIns.length === 0 ? (
          <EmptyState icon={<InboxIcon />} title={t('membership.detail.noCheckIns')} />
        ) : (
          <DataTable<MembershipCheckIn>
            columns={checkInColumns}
            data={membership.checkIns}
            getRowId={(checkIn) => checkIn.id}
            actionsLabel={t('common.actions')}
          />
        )}
      </Card>
    </div>
  );
}
