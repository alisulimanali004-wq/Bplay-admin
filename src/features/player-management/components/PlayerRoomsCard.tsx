import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Badge, DataTable, EmptyState, InboxIcon, type Column } from '@ui';
import { roomStatusBadgeVariant, type PlayerRoom } from '../api/player.types';
import { usePlayerRooms } from '../hooks/usePlayerRelated';
import styles from './playerCards.module.css';

interface Props {
  playerId: string;
}

/** Play rooms the player created (leader) or joined (member). */
export function PlayerRoomsCard({ playerId }: Props) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = usePlayerRooms(playerId);
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  const columns = useMemo<Column<PlayerRoom>[]>(
    () => [
      {
        key: 'match',
        header: t('player.rooms.match'),
        render: (r) => (
          <span className={styles.nameCell}>
            <span>{t(`player.sport.${r.sport}`)} · {r.facilityName}</span>
            <span className={styles.nameSub}>{t(`player.matchStyle.${r.matchStyle}`)} · {t(`player.roomType.${r.type}`)}</span>
          </span>
        ),
      },
      {
        key: 'date',
        header: t('player.rooms.date'),
        render: (r) => (
          <span className={styles.nameCell}>
            <span>{new Date(r.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className={styles.nameSub} dir="ltr">{r.startTime}</span>
          </span>
        ),
      },
      { key: 'role', header: t('player.rooms.role'), render: (r) => t(`player.roomRole.${r.role}`) },
      {
        key: 'players',
        header: t('player.rooms.players'),
        align: 'center',
        render: (r) => (
          <span dir="ltr" className={styles.invoiceAmount}>
            {r.joinedCount}/{r.requiredCount}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('player.rooms.status'),
        render: (r) => (
          <Badge variant={roomStatusBadgeVariant(r.status)}>{t(`player.roomStatus.${r.status}`)}</Badge>
        ),
      },
    ],
    [t, locale],
  );

  return (
    <Card padding="lg" className={styles.card} data-testid="player-rooms-card">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('player.tabs.rooms')}</h2>
      </div>
      <DataTable<PlayerRoom>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(r) => r.id}
        emptyState={<EmptyState icon={<InboxIcon />} title={t('player.rooms.empty')} />}
      />
    </Card>
  );
}
