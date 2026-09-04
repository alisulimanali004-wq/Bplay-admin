import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, DataTable, EmptyState, InboxIcon, Avatar, type Column } from '@ui';
import { PATHS } from '@app/router/paths';
import {
  getMemberships,
  membershipStatusBadgeVariant,
  type MembershipListItem,
} from '@features/club-subscriptions/api';
import styles from './playerCards.module.css';

interface Props {
  playerId: string;
}

/** The player's sports-club memberships (subscriptions to club packages). */
export function PlayerMembershipsCard({ playerId }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['player-memberships', playerId],
    queryFn: () => getMemberships({ playerId, page: 1, pageSize: 100 }),
    select: (result) => result.items,
  });

  const columns = useMemo<Column<MembershipListItem>[]>(
    () => [
      {
        key: 'club',
        header: t('player.memberships.club'),
        render: (m) => (
          <span className={styles.clubCell}>
            <Avatar src={m.clubLogoUrl} name={m.clubName} size="sm" />
            <span className={styles.nameCell}>
              <span>{m.clubName}</span>
              <span className={styles.nameSub}>{m.planName}</span>
            </span>
          </span>
        ),
      },
      {
        key: 'price',
        header: t('player.memberships.price'),
        align: 'end',
        render: (m) => (
          <span className={styles.invoiceAmount}>
            {nf.format(m.priceSyp)} {t('membership.currency')}
          </span>
        ),
      },
      {
        key: 'period',
        header: t('player.memberships.period'),
        render: (m) => (
          <span className={styles.nameSub} dir="ltr">
            {fmt(m.startDate)} – {fmt(m.endDate)}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('player.memberships.status'),
        render: (m) => (
          <Badge variant={membershipStatusBadgeVariant(m.status)}>
            {t(`membership.status.${m.status}`)}
          </Badge>
        ),
      },
    ],
    [t, locale, nf],
  );

  return (
    <Card padding="lg" className={styles.card} data-testid="player-memberships-card">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('player.memberships.title')}</h2>
      </div>
      <DataTable<MembershipListItem>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(m) => m.id}
        onRowClick={(m) => navigate(`${PATHS.clubSubscriptions}/${m.id}`)}
        emptyState={<EmptyState icon={<InboxIcon />} title={t('player.memberships.empty')} />}
      />
    </Card>
  );
}
