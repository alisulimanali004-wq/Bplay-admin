import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  ClearFiltersBar,
  DataTable,
  DateRange,
  DownloadIcon,
  EMPTY_DATE_RANGE,
  EmptyState,
  FilterField,
  FilterIcon,
  InboxIcon,
  LayersIcon,
  PageContainer,
  PageHeader,
  Pagination,
  SearchIcon,
  SearchInput,
  Select,
  Toolbar,
  XIcon,
  isDateRangeActive,
  useToast,
} from '@ui';
import { toAppError } from '@shared/lib/errors';
import { AuditEntryModal } from '../components/AuditEntryModal';
import { useAuditColumns } from '../components/useAuditColumns';
import { useAuditFormat } from '../hooks/useAuditFormat';
import { useAuditQuery } from '../hooks/useAuditQuery';
import { getAuditForExport } from '../api';
import { exportAuditLog } from '../lib/auditExport';
import { AUDIT_EXPORT_LIMIT, AUDIT_PAGE_SIZE } from '../api/audit.types';
import type { AuditEntry, AuditListParams } from '../api/audit.types';
import styles from './AuditPage.module.css';

const INITIAL: AuditListParams = {
  q: '',
  action: 'all',
  entityType: 'all',
  entityId: undefined,
  dateRange: EMPTY_DATE_RANGE,
  page: 1,
  pageSize: AUDIT_PAGE_SIZE,
};

/**
 * AUDIT — the administrative trail (SRS module 04).
 *
 * SUPER-ADMIN ONLY (AUD2). The route guard enforces it; this page carries no
 * role branch of its own, because a screen that renders differently per role is
 * a screen someone eventually ships to the wrong one.
 *
 * READ-ONLY BY CONSTRUCTION (AUD7): the only actions here are filtering, opening
 * an entry and exporting. There is no row action, no bulk bar and no destructive
 * anything — an audit trail you can edit is not an audit trail.
 */
export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const fmt = useAuditFormat();

  const [params, setParams] = useState<AuditListParams>(INITIAL);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useAuditQuery(params);
  const columns = useAuditColumns();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  /** Any change to a filter resets to page 1 — page 4 of a new result set is meaningless. */
  const patch = useCallback((next: Partial<AuditListParams>) => {
    setParams((previous) => ({ ...previous, ...next, page: 1 }));
  }, []);

  const hasFilters =
    (params.q ?? '') !== '' ||
    (params.action ?? 'all') !== 'all' ||
    (params.entityType ?? 'all') !== 'all' ||
    Boolean(params.entityId) ||
    isDateRangeActive(params.dateRange ?? EMPTY_DATE_RANGE);

  const reset = useCallback(() => setParams(INITIAL), []);

  /**
   * AUD6 — the action / entity filters are populated from the values the log
   * ACTUALLY contains, with the translated label where the vocabulary knows one.
   */
  const actionOptions = useMemo(
    () => [
      { value: 'all', label: t('audit.filters.allActions') },
      ...(data?.availableActions ?? []).map((action) => ({
        value: action,
        label: fmt.verbLabel(action),
      })),
    ],
    [data?.availableActions, fmt, t],
  );

  const entityOptions = useMemo(
    () => [
      { value: 'all', label: t('audit.filters.allEntities') },
      ...(data?.availableEntityTypes ?? []).map((entityType) => ({
        value: entityType,
        label: fmt.entityLabel(entityType),
      })),
    ],
    [data?.availableEntityTypes, fmt, t],
  );

  /**
   * AUD6 — jump from one entry to that record's whole history. Closing the
   * dialog first keeps the transition legible: the list visibly narrows behind
   * a banner naming the record.
   */
  const viewEntityHistory = useCallback(
    (entityId: string) => {
      setSelected(null);
      patch({ entityId });
    },
    [patch],
  );

  /**
   * FR-ADM-AUDIT-007 — export the CURRENT filter, not the current page.
   *
   * The rows are re-fetched rather than taken from `items`, which holds only the
   * twenty on screen. The ceiling is announced when it bites, so nobody mistakes
   * a truncated file for the whole trail.
   */
  const exportCurrent = async () => {
    setIsExporting(true);
    try {
      const rows = await getAuditForExport(params);
      if (rows.length === 0) {
        toast.info(t('audit.export.empty'));
        return;
      }
      await exportAuditLog(rows, t, i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US');
      if (rows.length >= AUDIT_EXPORT_LIMIT) {
        toast.warning(t('audit.export.truncated', { count: AUDIT_EXPORT_LIMIT }));
      } else {
        toast.success(t('audit.export.done', { count: rows.length }));
      }
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        actions={
          <Button
            variant="secondary"
            leftIcon={<DownloadIcon />}
            isLoading={isExporting}
            disabled={isLoading || isError}
            onClick={exportCurrent}
            data-testid="audit-export"
          >
            {t('common.export')}
          </Button>
        }
      />

      {/* AUD7 made visible: the log cannot be edited from anywhere in the app. */}
      <Alert variant="info">{t('audit.appendOnlyNotice')}</Alert>

      <Toolbar
        end={
          hasFilters ? (
            <ClearFiltersBar count={total} onClear={reset} testId="audit-clear-filters" />
          ) : undefined
        }
      >
        <FilterField label={t('audit.filters.search')} icon={<SearchIcon />}>
          <SearchInput
            value={params.q ?? ''}
            onChange={(q) => patch({ q })}
            placeholder={t('audit.filters.searchPlaceholder')}
            testId="audit-search"
          />
        </FilterField>

        <FilterField label={t('audit.columns.action')} icon={<FilterIcon />}>
          <Select
            value={params.action ?? 'all'}
            onChange={(action) => patch({ action })}
            options={actionOptions}
            aria-label={t('audit.columns.action')}
          />
        </FilterField>

        <FilterField label={t('audit.columns.entityType')} icon={<LayersIcon />}>
          <Select
            value={params.entityType ?? 'all'}
            onChange={(entityType) => patch({ entityType })}
            options={entityOptions}
            aria-label={t('audit.columns.entityType')}
          />
        </FilterField>

        <FilterField label={t('audit.filters.date')} icon={<FilterIcon />}>
          <DateRange
            value={params.dateRange ?? EMPTY_DATE_RANGE}
            onChange={(dateRange) => patch({ dateRange })}
            ariaLabel={t('audit.filters.date')}
            allLabel={t('audit.filters.allTime')}
            last7Label={t('audit.filters.last7')}
            last30Label={t('audit.filters.last30')}
            last90Label={t('audit.filters.last90')}
            customLabel={t('audit.filters.custom')}
            fromLabel={t('audit.filters.from')}
            toLabel={t('audit.filters.to')}
          />
        </FilterField>
      </Toolbar>

      {/* AUD6 — the "entity history" lens. It is a MODE, not one filter among
          others, so it gets its own banner with its own way out. */}
      {params.entityId && (
        <div className={styles.entityBanner} data-testid="audit-entity-banner">
          <span className={styles.entityBannerText}>
            {t('audit.entityHistory.banner')}
            <code className={styles.entityBannerId} dir="auto">
              {params.entityId}
            </code>
          </span>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<XIcon />}
            onClick={() => patch({ entityId: undefined })}
            data-testid="audit-clear-entity"
          >
            {t('audit.entityHistory.clear')}
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        error={isError ? t('common.loadError') : undefined}
        onRetry={() => void refetch()}
        getRowId={(entry) => entry.id}
        onRowClick={setSelected}
        emptyState={
          <EmptyState
            icon={<InboxIcon />}
            title={hasFilters ? t('audit.empty.noMatches') : t('audit.empty.noEntries')}
            description={
              hasFilters ? t('audit.empty.noMatchesHint') : t('audit.empty.noEntriesHint')
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={reset}>
                  {t('common.clearFilters')}
                </Button>
              ) : undefined
            }
          />
        }
      />

      {!isLoading && !isError && items.length > 0 && (
        <Pagination
          page={data?.page ?? 1}
          pageCount={data?.pageCount ?? 1}
          onPageChange={(page) => setParams((previous) => ({ ...previous, page }))}
        />
      )}

      <AuditEntryModal
        entry={selected}
        onClose={() => setSelected(null)}
        onViewEntityHistory={viewEntityHistory}
        isViewingEntityHistory={Boolean(params.entityId)}
      />
    </PageContainer>
  );
}
