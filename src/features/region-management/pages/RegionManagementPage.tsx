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
  EmptyState,
  PlusIcon,
  InboxIcon,
  SearchIcon,
  PowerIcon,
  MapPinIcon,
  type Column,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { statusToBadgeVariant } from '@shared/utils/status';
import { googleMapsLink, formatLatLng } from '@shared/lib/geo';
import { PATHS } from '@app/router/paths';
import { useRegionsQuery } from '../hooks/useRegionsQuery';
import { useRegionFacilityCounts } from '../hooks/useRegionFacilityCounts';
import { useRegionStats } from '../hooks/useRegionStats';
import { RegionOverviewStats } from '../components/RegionOverviewStats';
import { RegionFormModal } from '../components/RegionFormModal';
import { AssignAdminModal } from '../components/AssignAdminModal';
import { RegionRowActions } from '../components/RegionRowActions';
import type { Region, RegionListParams } from '../api/region.types';
import styles from './RegionManagementPage.module.css';

const MAX_ADMIN_NAMES = 2;

export default function RegionManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useDisclosure();
  const [editing, setEditing] = useState<Region | null>(null);
  const [assigning, setAssigning] = useState<Region | null>(null);
  const [params, setParams] = useState<RegionListParams>({
    q: '',
    status: 'all',
    assignment: 'all',
    page: 1,
  });
  const { data, isLoading, isError, refetch } = useRegionsQuery(params);
  const { data: facilityCounts } = useRegionFacilityCounts();
  const { data: stats } = useRegionStats();
  const facilitiesTotal = Object.values(facilityCounts ?? {}).reduce((sum, count) => sum + count, 0);

  const hasActiveFilters =
    (params.q ?? '') !== '' ||
    (params.status ?? 'all') !== 'all' ||
    (params.assignment ?? 'all') !== 'all' ||
    (params.showDeleted ?? false);

  const clearFilters = () =>
    setParams((prev) => ({
      ...prev,
      q: '',
      status: 'all',
      assignment: 'all',
      showDeleted: false,
      page: 1,
    }));

  const renderAdmins = (region: Region) => {
    const names = region.assignedAdminNames;
    if (names.length === 0) return '—';
    const shown = names.slice(0, MAX_ADMIN_NAMES).join(', ');
    const extra = names.length - MAX_ADMIN_NAMES;
    return extra > 0 ? `${shown} +${extra}` : shown;
  };

  const openDetail = (region: Region) => navigate(`${PATHS.regionManagement}/${region.id}`);

  const columns: Column<Region>[] = [
    {
      key: 'name',
      header: t('region.col.name'),
      render: (region) => (
        <button
          type="button"
          className={styles.nameLink}
          onClick={() => openDetail(region)}
          data-testid={`region-name-${region.id}`}
        >
          {region.name}
        </button>
      ),
    },
    {
      key: 'location',
      header: t('region.col.location'),
      render: (region) => (
        <>
          <a
            href={googleMapsLink(region.centerLat, region.centerLng)}
            target="_blank"
            rel="noreferrer"
            dir="ltr"
          >
            {formatLatLng(region.centerLat, region.centerLng)}
          </a>
          {` · ${t('region.form.radiusKm', { km: region.radiusKm })}`}
        </>
      ),
    },
    {
      key: 'admins',
      header: t('region.col.admins'),
      render: renderAdmins,
    },
    {
      key: 'facilities',
      header: t('region.col.facilities'),
      align: 'center',
      render: (region) => facilityCounts?.[region.id] ?? 0,
    },
    {
      key: 'status',
      header: t('region.col.status'),
      render: (region) =>
        region.isDeleted ? (
          <Badge variant="danger">{t('region.deletedTag')}</Badge>
        ) : (
          <Badge variant={statusToBadgeVariant(region.status)}>
            {t(`region.status.${region.status}`)}
          </Badge>
        ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('region.title')}
        subtitle={t('region.subtitle')}
        actions={
          <Button leftIcon={<PlusIcon />} onClick={create.open} data-testid="region-create">
            {t('region.create')}
          </Button>
        }
      />

      <RegionOverviewStats stats={stats} facilities={facilitiesTotal} />

      <Toolbar
        end={
          hasActiveFilters ? (
            <ClearFiltersBar
              count={data?.total ?? 0}
              onClear={clearFilters}
              testId="region-clear-filters"
            />
          ) : null
        }
      >
        <FilterField label={t('common.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => setParams((prev) => ({ ...prev, q, page: 1 }))}
            placeholder={t('region.search')}
          />
        </FilterField>
        <FilterField label={t('region.col.status')} icon={<PowerIcon />}>
          <Select
            aria-label={t('region.col.status')}
            value={params.status ?? 'all'}
            onChange={(value) =>
              setParams((prev) => ({
                ...prev,
                status: value as RegionListParams['status'],
                page: 1,
              }))
            }
            options={[
              { value: 'all', label: t('region.filter.all') },
              { value: 'active', label: t('region.status.active') },
              { value: 'inactive', label: t('region.status.inactive') },
            ]}
          />
        </FilterField>
        <FilterField label={t('region.filter.assignment')} icon={<MapPinIcon />}>
          <Select
            aria-label={t('region.filter.assignment')}
            value={params.assignment ?? 'all'}
            onChange={(value) =>
              setParams((prev) => ({
                ...prev,
                assignment: value as RegionListParams['assignment'],
                page: 1,
              }))
            }
            options={[
              { value: 'all', label: t('region.filter.allAssignment') },
              { value: 'assigned', label: t('region.filter.withAdmin') },
              { value: 'unassigned', label: t('region.filter.noAdmin') },
            ]}
          />
        </FilterField>
        <label className={styles.deletedToggle}>
          <input
            type="checkbox"
            className={styles.deletedCheckbox}
            checked={params.showDeleted ?? false}
            onChange={(event) =>
              setParams((prev) => ({ ...prev, showDeleted: event.target.checked, page: 1 }))
            }
            data-testid="region-show-deleted"
          />
          <span>{t('region.filter.showDeleted')}</span>
        </label>
      </Toolbar>

      <DataTable<Region>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(region) => region.id}
        emptyState={
          <EmptyState
            icon={<InboxIcon />}
            title={t(params.showDeleted ? 'region.emptyDeleted.title' : 'region.empty.title')}
            description={t(params.showDeleted ? 'region.emptyDeleted.desc' : 'region.empty.desc')}
          />
        }
        rowActions={(region) => (
          <RegionRowActions
            region={region}
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

      <RegionFormModal isOpen={create.isOpen} onClose={create.close} region={null} />
      <RegionFormModal isOpen={editing !== null} onClose={() => setEditing(null)} region={editing} />
      <AssignAdminModal
        isOpen={assigning !== null}
        onClose={() => setAssigning(null)}
        region={assigning}
      />
    </PageContainer>
  );
}
