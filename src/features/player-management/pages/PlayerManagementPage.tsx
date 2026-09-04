import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  Toolbar,
  SearchInput,
  Select,
  FilterField,
  DataTable,
  Pagination,
  Badge,
  UserCell,
  RatingStars,
  ClearFiltersBar,
  EmptyState,
  Button,
  PlusIcon,
  InboxIcon,
  SearchIcon,
  PowerIcon,
  CreditCardIcon,
  MapPinIcon,
  TrophyIcon,
  CalendarIcon,
  type Column,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { PATHS } from '@app/router/paths';
import { usePlayersQuery } from '../hooks/usePlayersQuery';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { PlayerStatCards } from '../components/PlayerStatCards';
import { PlayerRowActions } from '../components/PlayerRowActions';
import { PlayerFormModal } from '../components/PlayerFormModal';
import {
  ACCOUNT_TYPE_VARIANT,
  playerState,
  playerStateBadgeVariant,
  type Player,
  type PlayerListParams,
  type SportKind,
} from '../api/player.types';

const INITIAL: PlayerListParams = {
  q: '',
  status: 'all',
  accountType: 'all',
  city: 'all',
  sport: 'all',
  joined: 'all',
  page: 1,
};

const GOVERNORATES = ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Tartus', 'Hama', 'Daraa', 'Idlib'];
const SPORTS: SportKind[] = ['football', 'padel', 'tennis', 'basketball', 'volleyball', 'swimming'];

export default function PlayerManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useState<PlayerListParams>(INITIAL);
  const { data, isLoading, isError, refetch } = usePlayersQuery(params);
  const { data: stats } = usePlayerStats();
  const create = useDisclosure();

  const openProfile = (player: Player) => navigate(`${PATHS.playerManagement}/${player.id}`);
  const patch = (next: Partial<PlayerListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.status ?? 'all') !== 'all' ||
    (params.accountType ?? 'all') !== 'all' ||
    (params.city ?? 'all') !== 'all' ||
    (params.sport ?? 'all') !== 'all' ||
    (params.joined ?? 'all') !== 'all';

  const columns: Column<Player>[] = [
    {
      key: 'name',
      header: t('player.col.name'),
      render: (player) => (
        <UserCell
          name={player.name}
          email={player.email}
          photoUrl={player.photoUrl}
          onClick={() => openProfile(player)}
          testId={`player-name-${player.id}`}
        />
      ),
    },
    {
      key: 'city',
      header: t('player.col.city'),
      render: (player) => player.city || '—',
    },
    {
      key: 'plan',
      header: t('player.col.plan'),
      render: (player) => (
        <Badge variant={ACCOUNT_TYPE_VARIANT[player.accountType]}>
          {player.accountType === 'paid' && player.currentPlan
            ? player.currentPlan
            : t(`player.accountType.${player.accountType}`)}
        </Badge>
      ),
    },
    {
      key: 'rating',
      header: t('player.col.rating'),
      align: 'center',
      render: (player) => <RatingStars value={player.overallRating ?? null} size="sm" />,
    },
    {
      key: 'status',
      header: t('player.col.status'),
      render: (player) => {
        const state = playerState(player);
        return <Badge variant={playerStateBadgeVariant(state)}>{t(`player.state.${state}`)}</Badge>;
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('player.title')}
        subtitle={t('player.subtitle')}
        actions={
          <Button leftIcon={<PlusIcon />} onClick={create.open} data-testid="player-create">
            {t('player.create.title')}
          </Button>
        }
      />

      <PlayerStatCards stats={stats} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={() => setParams(INITIAL)}
              testId="player-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => patch({ q })}
            placeholder={t('player.search')}
          />
        </FilterField>
        <FilterField label={t('player.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('player.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) => patch({ status: value as PlayerListParams['status'] })}
            options={[
              { value: 'all', label: t('player.filter.allStatus') },
              { value: 'active', label: t('player.state.active') },
              { value: 'suspended', label: t('player.state.suspended') },
              { value: 'blocked', label: t('player.state.blocked') },
            ]}
          />
        </FilterField>
        <FilterField label={t('player.col.plan')} icon={<CreditCardIcon />}>
          <Select
            aria-label={t('player.col.plan')}
            value={params.accountType ?? 'all'}
            onChange={(value) => patch({ accountType: value as PlayerListParams['accountType'] })}
            options={[
              { value: 'all', label: t('player.filter.allPlans') },
              { value: 'paid', label: t('player.accountType.paid') },
              { value: 'free', label: t('player.accountType.free') },
            ]}
          />
        </FilterField>
        <FilterField label={t('player.col.city')} icon={<MapPinIcon />}>
          <Select
            aria-label={t('player.col.city')}
            value={params.city ?? 'all'}
            onChange={(value) => patch({ city: value })}
            options={[
              { value: 'all', label: t('player.filter.allCities') },
              ...GOVERNORATES.map((city) => ({ value: city, label: city })),
            ]}
          />
        </FilterField>
        <FilterField label={t('player.filter.sport')} icon={<TrophyIcon />}>
          <Select
            aria-label={t('player.filter.sport')}
            value={params.sport ?? 'all'}
            onChange={(value) => patch({ sport: value as PlayerListParams['sport'] })}
            options={[
              { value: 'all', label: t('player.filter.allSports') },
              ...SPORTS.map((sport) => ({ value: sport, label: t(`player.sport.${sport}`) })),
            ]}
          />
        </FilterField>
        <FilterField label={t('player.filter.joined')} icon={<CalendarIcon />}>
          <Select
            aria-label={t('player.filter.joined')}
            value={params.joined ?? 'all'}
            onChange={(value) => patch({ joined: value as PlayerListParams['joined'] })}
            options={[
              { value: 'all', label: t('player.filter.joinedAll') },
              { value: '7d', label: t('player.filter.joined7d') },
              { value: '30d', label: t('player.filter.joined30d') },
              { value: '90d', label: t('player.filter.joined90d') },
              { value: 'year', label: t('player.filter.joinedYear') },
            ]}
          />
        </FilterField>
      </Toolbar>

      <DataTable<Player>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(player) => player.id}
        emptyState={
          <EmptyState
            icon={<InboxIcon />}
            title={t('player.empty.title')}
            description={t('player.empty.desc')}
          />
        }
        rowActions={(player) => <PlayerRowActions player={player} onView={openProfile} />}
      />

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
      />

      <PlayerFormModal isOpen={create.isOpen} onClose={create.close} />
    </PageContainer>
  );
}
