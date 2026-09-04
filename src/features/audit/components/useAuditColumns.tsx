import { useTranslation } from 'react-i18next';
import { Avatar, clsx, type Column } from '@ui';
import { entityDisplayId } from '../api/audit.types';
import { useAuditFormat } from '../hooks/useAuditFormat';
import { AuditActionBadge, AuditEntityCell } from './AuditActionBadge';
import type { AuditEntry } from '../api/audit.types';
import styles from './auditCells.module.css';

/**
 * FR-ADM-AUDIT-003 — the log's columns, in the order the SRS lists them:
 * timestamp · actor (name + email) · action · entity type · entity · IP.
 *
 * None are sortable. The trail has exactly one meaningful order — newest first —
 * and a re-sort would only let an investigator lose the thread they were
 * following.
 */
export function useAuditColumns(): Column<AuditEntry>[] {
  const { t } = useTranslation();
  const fmt = useAuditFormat();

  return [
    {
      key: 'createdAt',
      header: t('audit.columns.timestamp'),
      width: '180px',
      render: (entry) => (
        <time className={styles.time} dateTime={entry.createdAt} title={fmt.dateTime(entry.createdAt)}>
          {fmt.dateTime(entry.createdAt)}
        </time>
      ),
    },
    {
      key: 'actor',
      header: t('audit.columns.actor'),
      render: (entry) => {
        const name = fmt.actorName(entry.actor);
        const anonymous = fmt.isAnonymousActor(entry.actor);
        return (
          <span className={styles.actor}>
            <Avatar name={name} size="sm" />
            <span className={styles.actorText}>
              <span className={clsx(styles.actorName, anonymous && styles.actorMuted)} dir="auto">
                {name}
              </span>
              {entry.actor.email && (
                <span className={styles.actorEmail} dir="auto">
                  {entry.actor.email}
                </span>
              )}
            </span>
          </span>
        );
      },
    },
    {
      key: 'action',
      header: t('audit.columns.action'),
      render: (entry) => <AuditActionBadge action={entry.action} entityType={entry.entityType} />,
    },
    {
      key: 'entityType',
      header: t('audit.columns.entityType'),
      render: (entry) => <AuditEntityCell entityType={entry.entityType} className={styles.entity} />,
    },
    {
      key: 'entityId',
      header: t('audit.columns.entityId'),
      render: (entry) => (
        // The full id can be long and opaque; the cell shows a readable label or
        // a shortened id, and the dialog carries the exact value.
        <span
          className={clsx(styles.entityId, !entry.entityId && styles.dim)}
          title={entry.entityId ?? undefined}
          dir="auto"
        >
          {entityDisplayId(entry)}
        </span>
      ),
    },
    {
      key: 'ip',
      header: t('audit.columns.ip'),
      width: '140px',
      render: (entry) =>
        entry.ip ? (
          <span className={styles.ip}>{entry.ip}</span>
        ) : (
          <span className={styles.dim}>—</span>
        ),
    },
  ];
}
