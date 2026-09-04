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
  Button,
  ClearFiltersBar,
  EmptyState,
  PlusIcon,
  InboxIcon,
  SearchIcon,
  PowerIcon,
  BuildingIcon,
  CalendarIcon,
  type Column,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { PATHS } from '@app/router/paths';
import { useOwnersQuery } from '../hooks/useOwnersQuery';
import { useOwnerStats } from '../hooks/useOwnerStats';
import { OwnerStatCards } from '../components/OwnerStatCards';
import { OwnerRowActions } from '../components/OwnerRowActions';
import { OwnerFormModal } from '../components/OwnerFormModal';
import {
  ownerState,
  ownerStateBadgeVariant,
  type Owner,
  type OwnerListParams,
} from '../api/owner.types';

const INITIAL: OwnerListParams = {
  q: '',
  status: 'all',
  facilities: 'all',
  joined: 'all',
  page: 1,
};

export default function OwnerManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useDisclosure();
  const [params, setParams] = useState<OwnerListParams>(INITIAL);
  const { data, isLoading, isError, refetch } = useOwnersQuery(params);
  const { data: stats } = useOwnerStats();

  const openProfile = (owner: Owner) => navigate(`${PATHS.ownerManagement}/${owner.id}`);
  const patch = (next: Partial<OwnerListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: 1 }));

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.status ?? 'all') !== 'all' ||
    (params.facilities ?? 'all') !== 'all' ||
    (params.joined ?? 'all') !== 'all';

  const columns: Column<Owner>[] = [
    {
      key: 'name',
      header: t('owner.col.name'),
      render: (owner) => (
        <UserCell
          name={owner.name}
          email={owner.email}
          photoUrl={owner.photoUrl}
          onClick={() => openProfile(owner)}
          testId={`owner-name-${owner.id}`}
        />
      ),
    },
    {
      key: 'facilities',
      header: t('owner.col.facilities'),
      align: 'center',
      render: (owner) => owner.facilitiesCount ?? 0,
    },
    {
      key: 'status',
      header: t('owner.col.status'),
      render: (owner) => {
        const state = ownerState(owner);
        return <Badge variant={ownerStateBadgeVariant(state)}>{t(`owner.state.${state}`)}</Badge>;
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('owner.title')}
        subtitle={t('owner.subtitle')}
        actions={
          <Button leftIcon={<PlusIcon />} onClick={create.open} data-testid="owner-create">
            {t('owner.create.title')}
          </Button>
        }
      />

      <OwnerStatCards stats={stats} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={() => setParams(INITIAL)}
              testId="owner-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => patch({ q })}
            placeholder={t('owner.search')}
          />
        </FilterField>
        <FilterField label={t('owner.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('owner.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) => patch({ status: value as OwnerListParams['status'] })}
            options={[
              { value: 'all', label: t('owner.filter.allStatus') },
              { value: 'under_review', label: t('owner.state.under_review') },
              { value: 'active', label: t('owner.state.active') },
              { value: 'rejected', label: t('owner.state.rejected') },
              { value: 'suspended', label: t('owner.state.suspended') },
              { value: 'blocked', label: t('owner.state.blocked') },
            ]}
          />
        </FilterField>
        <FilterField label={t('owner.col.facilities')} icon={<BuildingIcon />}>
          <Select
            aria-label={t('owner.col.facilities')}
            value={params.facilities ?? 'all'}
            onChange={(value) => patch({ facilities: value as OwnerListParams['facilities'] })}
            options={[
              { value: 'all', label: t('owner.filter.allFacilities') },
              { value: 'has', label: t('owner.filter.hasFacilities') },
              { value: 'none', label: t('owner.filter.noFacilities') },
            ]}
          />
        </FilterField>
        <FilterField label={t('owner.filter.joined')} icon={<CalendarIcon />}>
          <Select
            aria-label={t('owner.filter.joined')}
            value={params.joined ?? 'all'}
            onChange={(value) => patch({ joined: value as OwnerListParams['joined'] })}
            options={[
              { value: 'all', label: t('owner.filter.joinedAll') },
              { value: '7d', label: t('owner.filter.joined7d') },
              { value: '30d', label: t('owner.filter.joined30d') },
              { value: '90d', label: t('owner.filter.joined90d') },
              { value: 'year', label: t('owner.filter.joinedYear') },
            ]}
          />
        </FilterField>
      </Toolbar>

      <DataTable<Owner>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(owner) => owner.id}
        emptyState={
          <EmptyState
            icon={<InboxIcon />}
            title={t('owner.empty.title')}
            description={t('owner.empty.desc')}
          />
        }
        rowActions={(owner) => <OwnerRowActions owner={owner} onView={openProfile} />}
      />

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
      />

      <OwnerFormModal isOpen={create.isOpen} onClose={create.close} />
    </PageContainer>
  );
}
