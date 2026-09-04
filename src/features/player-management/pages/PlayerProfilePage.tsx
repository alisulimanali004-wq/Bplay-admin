import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  DetailHero,
  MetaItem,
  Badge,
  Avatar,
  Spinner,
  ErrorState,
  EmptyState,
  ImageLightbox,
  Tabs,
  InboxIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  toLocalPhone,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { usePlayerQuery } from '../hooks/usePlayerQuery';
import { PlayerStatusActions } from '../components/PlayerStatusActions';
import { PlayerAttentionCard } from '../components/PlayerAttentionCard';
import { PlayerActivityStats } from '../components/PlayerActivityStats';
import { PlayerAboutCard } from '../components/PlayerAboutCard';
import { PlayerAccountCard } from '../components/PlayerAccountCard';
import { PlayerLocationCard } from '../components/PlayerLocationCard';
import { PlayerBookingsCard } from '../components/PlayerBookingsCard';
import { PlayerSubscriptionCard } from '../components/PlayerSubscriptionCard';
import { PlayerMembershipsCard } from '../components/PlayerMembershipsCard';
import { PlayerRoomsCard } from '../components/PlayerRoomsCard';
import { PlayerRatingsCard } from '../components/PlayerRatingsCard';
import { PlayerReportsCard } from '../components/PlayerReportsCard';
import { PlayerPostsCard } from '../components/PlayerPostsCard';
import {
  ACCOUNT_TYPE_VARIANT,
  playerState,
  playerStateBadgeVariant,
  type Player,
} from '../api/player.types';
import styles from './PlayerProfilePage.module.css';

const NOT_FOUND_MESSAGE = 'Player not found';
const TAB_KEYS = ['overview', 'posts', 'bookings', 'subscriptions', 'rooms', 'ratings', 'reports'] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const { t } = useTranslation();
  const { data: player, isLoading, isError, error, refetch } = usePlayerQuery(playerId);

  const notFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !player);

  return (
    <PageContainer>
      <PageHeader
        title={player ? player.name : t('player.profile.title')}
        subtitle={t('player.profile.subtitle')}
        showBack
        backLabel={t('common.back')}
        actions={player ? <PlayerStatusActions player={player} /> : undefined}
      />

      {isLoading ? (
        <div className={styles.center}>
          <Spinner size="lg" />
        </div>
      ) : notFound ? (
        <EmptyState icon={<InboxIcon />} title={t('player.profile.notFound')} />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : player ? (
        <PlayerProfileContent player={player} />
      ) : null}
    </PageContainer>
  );
}

function PlayerProfileContent({ player }: { player: Player }) {
  const { t, i18n } = useTranslation();
  const lightbox = useDisclosure();
  const [tab, setTab] = useState<TabKey>('overview');

  const state = playerState(player);
  const dateLocale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const createdLabel = player.createdAt
    ? new Date(player.createdAt).toLocaleDateString(dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const phoneLabel = player.phone ? `+963 ${toLocalPhone(player.phone)}` : '—';

  const tabs = TAB_KEYS.map((key) => ({
    key,
    label: t(`player.tabs.${key}`),
    badge: key === 'reports' && player.openReportsCount > 0 ? player.openReportsCount : undefined,
  }));

  return (
    <div className={styles.page}>
      <DetailHero
        name={player.name}
        email={player.email}
        photoUrl={player.photoUrl}
        onPhotoClick={lightbox.open}
        photoLabel={t('player.profile.viewPhoto')}
        testId="player-detail-hero"
        badges={
          <>
            <Badge variant={playerStateBadgeVariant(state)}>{t(`player.state.${state}`)}</Badge>
            <Badge variant={ACCOUNT_TYPE_VARIANT[player.accountType]}>
              {t(`player.accountType.${player.accountType}`)}
            </Badge>
          </>
        }
        meta={
          <>
            <MetaItem icon={<PhoneIcon />} label={t('player.col.phone')} value={phoneLabel} ltr />
            {player.city && (
              <MetaItem icon={<MapPinIcon />} label={t('player.col.city')} value={player.city} />
            )}
            {createdLabel && (
              <MetaItem icon={<CalendarIcon />} label={t('player.col.joined')} value={createdLabel} />
            )}
          </>
        }
      />

      <PlayerAttentionCard player={player} />

      <PlayerActivityStats player={player} />

      <Tabs items={tabs} value={tab} onChange={(key) => setTab(key as TabKey)} aria-label={t('player.tabs.aria')} />

      <div className={styles.tabPanel}>
        {tab === 'overview' && (
          <div className={styles.panel}>
            <div className={styles.grid}>
              <PlayerAboutCard player={player} />
              <PlayerAccountCard player={player} />
            </div>
            <PlayerLocationCard player={player} />
          </div>
        )}
        {tab === 'posts' && <PlayerPostsCard playerId={player.id} />}
        {tab === 'bookings' && <PlayerBookingsCard playerId={player.id} />}
        {tab === 'subscriptions' && (
          <div className={styles.panel}>
            <PlayerSubscriptionCard playerId={player.id} />
            <PlayerMembershipsCard playerId={player.id} />
          </div>
        )}
        {tab === 'rooms' && <PlayerRoomsCard playerId={player.id} />}
        {tab === 'ratings' && <PlayerRatingsCard playerId={player.id} />}
        {tab === 'reports' && <PlayerReportsCard playerId={player.id} />}
      </div>

      <ImageLightbox
        isOpen={lightbox.isOpen}
        onClose={lightbox.close}
        src={player.photoUrl}
        alt={player.name}
        title={player.name}
        closeLabel={t('common.close')}
        zoomInLabel={t('common.zoomIn')}
        zoomOutLabel={t('common.zoomOut')}
        resetLabel={t('common.resetZoom')}
        fallback={<Avatar name={player.name} size="xl" />}
      />
    </div>
  );
}
