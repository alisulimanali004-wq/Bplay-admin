import type { TFunction } from 'i18next';
import { exportToXlsx, type XlsxColumn } from '@shared/lib/exportXlsx';
import { isKnownEntityType, isKnownVerb, isStandaloneVerb } from '../api/audit.types';
import type { AuditEntry } from '../api/audit.types';

/**
 * FR-ADM-AUDIT-007 — export the log to Excel.
 *
 * The rows handed in are ALREADY the filtered set (AUD3), so this file only
 * decides the columns. Those are exactly the ones the SRS names — timestamp,
 * actor, email, action, entity type, entity, IP, device — which is one more
 * than the table shows: the user-agent has no room on screen but is precisely
 * what an offline investigation wants.
 *
 * Every cell is a plain string. `exportToXlsx` is write-only (`json_to_sheet` /
 * `writeFile`), so nothing here parses untrusted spreadsheet input.
 */
export function exportAuditLog(
  entries: AuditEntry[],
  t: TFunction,
  locale: string,
): Promise<void> {
  const dateTime = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  /** Same composition rule as the on-screen badge, so the two never disagree. */
  const actionLabel = (entry: AuditEntry): string => {
    const verb = isKnownVerb(entry.action) ? t(`audit.verb.${entry.action}`) : entry.action;
    const entity = isKnownEntityType(entry.entityType)
      ? t(`audit.entity.${entry.entityType}`)
      : entry.entityType;
    if (!verb) return entity;
    if (!entity || isStandaloneVerb(entry.action)) return verb;
    return t('audit.actionPattern', { verb, entity });
  };

  const actorName = (entry: AuditEntry): string => {
    if (entry.actor.id === null) return t('audit.actor.system');
    return entry.actor.name?.trim() || t('audit.actor.unknown');
  };

  const columns: XlsxColumn<AuditEntry>[] = [
    { header: t('audit.columns.timestamp'), value: (row) => dateTime.format(new Date(row.createdAt)) },
    { header: t('audit.columns.actor'), value: (row) => actorName(row) },
    { header: t('audit.columns.email'), value: (row) => row.actor.email ?? '' },
    { header: t('audit.columns.action'), value: (row) => actionLabel(row) },
    {
      header: t('audit.columns.entityType'),
      value: (row) =>
        isKnownEntityType(row.entityType) ? t(`audit.entity.${row.entityType}`) : row.entityType,
    },
    {
      header: t('audit.columns.entityId'),
      // The FULL id here, never the shortened display form — a spreadsheet is
      // where someone copies an id from.
      value: (row) => row.entityLabel ?? row.entityId ?? '',
    },
    { header: t('audit.columns.ip'), value: (row) => row.ip ?? '' },
    { header: t('audit.detail.device'), value: (row) => row.userAgent ?? '' },
  ];

  return exportToXlsx('bplay-audit-log', t('audit.title'), columns, entries);
}
