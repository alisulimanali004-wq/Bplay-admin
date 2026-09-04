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
  Button,
  ClearFiltersBar,
  UserCell,
  EmptyState,
  PlusIcon,
  InboxIcon,
  SearchIcon,
  PowerIcon,
  UsersIcon,
  MapPinIcon,
  type Column,
  type BadgeVariant,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { statusToBadgeVariant } from '@shared/utils/status';
import { PATHS } from '@app/router/paths';
import { useAdminsQuery } from '../hooks/useAdminsQuery';
import { useAdminStats } from '../hooks/useAdminStats';
import { AdminOverviewStats } from '../components/AdminOverviewStats';
import { AdminFormModal } from '../components/AdminFormModal';
import { AssignRegionsModal } from '../components/AssignRegionsModal';
import { AdminRowActions } from '../components/AdminRowActions';
import type { Admin, AdminListParams, AdminScope } from '../api/admin.types';
import styles from './AdminManagementPage.module.css';

const MAX_REGION_NAMES = 2;

function scopeBadgeVariant(scope: AdminScope): BadgeVariant {
  return scope === 'general' ? 'info' : 'neutral';
}

export default function AdminManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useDisclosure();
  const [editing, setEditing] = useState<Admin | null>(null);
  const [assigning, setAssigning] = useState<Admin | null>(null);
  const [params, setParams] = useState<AdminListParams>({
    q: '',
    status: 'all',
    scope: 'all',
    assignment: 'all',
    page: 1,
  });
  const { data, isLoading, isError, refetch } = useAdminsQuery(params);
  const { data: stats } = useAdminStats();

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.status ?? 'all') !== 'all' ||
    (params.scope ?? 'all') !== 'all' ||
    (params.assignment ?? 'all') !== 'all';

  const clearFilters = () =>
    setParams((prev) => ({
      ...prev,
      q: '',
      status: 'all',
      scope: 'all',
      assignment: 'all',
      page: 1,
    }));

  const openDetail = (admin: Admin) => navigate(`${PATHS.adminManagement}/${admin.id}`);

  const renderRegions = (admin: Admin) => {
    if (admin.scope === 'general') return <span className={styles.muted}>{t('admin.scope.generalTag')}</span>;
    const names = admin.assignedRegionNames;
    if (names.length === 0) return <span className={styles.muted}>—</span>;
    const shown = names.slice(0, MAX_REGION_NAMES).join(', ');
    const extra = names.length - MAX_REGION_NAMES;
    return <span className={styles.regions}>{extra > 0 ? `${shown} +${extra}` : shown}</span>;
  };

  const columns: Column<Admin>[] = [
    {
      key: 'name',
      header: t('admin.col.name'),
      render: (admin) => (
        <UserCell
          name={admin.name}
          email={admin.email}
          photoUrl={admin.photoUrl}
          onClick={() => openDetail(admin)}
          testId={`admin-name-${admin.id}`}
        />
      ),
    },
    {
      key: 'scope',
      header: t('admin.col.scope'),
      render: (admin) => (
        <Badge variant={scopeBadgeVariant(admin.scope)}>{t(`admin.scope.${admin.scope}`)}</Badge>
      ),
    },
    {
      key: 'regions',
      header: t('admin.col.regions'),
      render: renderRegions,
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      render: (admin) => (
        <Badge variant={statusToBadgeVariant(admin.status)}>{t(`status.${admin.status}`)}</Badge>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={
          <Button leftIcon={<PlusIcon />} onClick={create.open} data-testid="admin-create">
            {t('admin.invite')}
          </Button>
        }
      />

      <AdminOverviewStats stats={stats} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={clearFilters}
              testId="admin-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => setParams((prev) => ({ ...prev, q, page: 1 }))}
            placeholder={t('admin.search')}
          />
        </FilterField>
        <FilterField label={t('admin.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('admin.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) =>
              setParams((prev) => ({ ...prev, status: value as AdminListParams['status'], page: 1 }))
            }
            options={[
              { value: 'all', label: t('status.all') },
              { value: 'active', label: t('status.active') },
              { value: 'suspended', label: t('status.suspended') },
            ]}
          />
        </FilterField>
        <FilterField label={t('admin.col.scope')} icon={<UsersIcon />}>
          <Select
            aria-label={t('admin.col.scope')}
            value={params.scope ?? 'all'}
            onChange={(value) =>
              setParams((prev) => ({ ...prev, scope: value as AdminListParams['scope'], page: 1 }))
            }
            options={[
              { value: 'all', label: t('admin.filter.allScope') },
              { value: 'general', label: t('admin.scope.general') },
              { value: 'regional', label: t('admin.scope.regional') },
            ]}
          />
        </FilterField>
        <FilterField label={t('admin.filter.assignment')} icon={<MapPinIcon />}>
          <Select
            aria-label={t('admin.filter.assignment')}
            value={params.assignment ?? 'all'}
            onChange={(value) =>
              setParams((prev) => ({
                ...prev,
                assignment: value as AdminListParams['assignment'],
                page: 1,
              }))
            }
            options={[
              { value: 'all', label: t('admin.filter.allAssignment') },
              { value: 'assigned', label: t('admin.filter.withRegion') },
              { value: 'unassigned', label: t('admin.filter.noRegion') },
            ]}
          />
        </FilterField>
      </Toolbar>

      <DataTable<Admin>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(admin) => admin.id}
        emptyState={
          <EmptyState
            icon={<InboxIcon />}
            title={t('admin.empty.title')}
            description={t('admin.empty.desc')}
          />
        }
        rowActions={(admin) => (
          <AdminRowActions
            admin={admin}
            onView={openDetail}
            onEdit={setEditing}
            onAssign={setAssigning}
          />
        )}
      />

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
      />

      <AdminFormModal isOpen={create.isOpen} onClose={create.close} admin={null} />
      <AdminFormModal isOpen={editing !== null} onClose={() => setEditing(null)} admin={editing} />
      <AssignRegionsModal
        isOpen={assigning !== null}
        onClose={() => setAssigning(null)}
        admin={assigning}
      />
    </PageContainer>
  );
}
