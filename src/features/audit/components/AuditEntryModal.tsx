import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Button, ClockIcon, ListIcon, Modal, clsx } from '@ui';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditDiff } from './AuditDiff';
import { useAuditFormat } from '../hooks/useAuditFormat';
import type { AuditEntry } from '../api/audit.types';
import styles from './auditEntryModal.module.css';

interface Props {
  entry: AuditEntry | null;
  onClose: () => void;
  /**
   * AUD6 — "سجل هذا العنصر": filter the list down to everything that ever
   * happened to this record. Absent when the entry has no resolvable id.
   */
  onViewEntityHistory: (entityId: string) => void;
  /** True when the list is ALREADY filtered to this entity — hides the button. */
  isViewingEntityHistory: boolean;
}

/**
 * FR-ADM-AUDIT-004 — one entry in full: the before/after comparison, the IP and
 * the device, plus the jump to that record's whole history.
 *
 * A DIALOG rather than a route, deliberately. An audit entry is a log line, not
 * an entity with a page of its own, and an investigation is a rhythm of
 * open-read-close-next — a route would throw away the filters, the page and the
 * scroll position on every one of those steps.
 *
 * There is no edit and no delete here, and there must never be: the trail is
 * append-only (AUD7).
 */
export function AuditEntryModal({
  entry,
  onClose,
  onViewEntityHistory,
  isViewingEntityHistory,
}: Props) {
  const { t } = useTranslation();
  const fmt = useAuditFormat();

  if (!entry) return null;

  const anonymous = fmt.isAnonymousActor(entry.actor);
  const actorName = fmt.actorName(entry.actor);
  const canViewHistory = Boolean(entry.entityId) && !isViewingEntityHistory;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('audit.detail.title')}
      size="lg"
      closeLabel={t('common.close')}
      footer={
        <>
          {canViewHistory && (
            <Button
              variant="secondary"
              leftIcon={<ListIcon />}
              onClick={() => onViewEntityHistory(entry.entityId as string)}
              data-testid="audit-entity-history"
            >
              {t('audit.actions.entityHistory')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.close')}</Button>
        </>
      }
    >
      <div className={styles.body}>
        {/* ---- what happened ---- */}
        <header className={styles.head}>
          <AuditActionBadge action={entry.action} entityType={entry.entityType} />
          <span className={styles.when}>
            <ClockIcon aria-hidden />
            <time dateTime={entry.createdAt}>{fmt.dateTime(entry.createdAt)}</time>
          </span>
        </header>

        {/* ---- who did it ---- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('audit.detail.actor')}</h3>
          <div className={styles.actor}>
            <Avatar name={actorName} size="sm" />
            <div className={styles.actorText}>
              <span className={clsx(styles.actorName, anonymous && styles.actorMuted)} dir="auto">
                {actorName}
              </span>
              {entry.actor.email && (
                <span className={styles.actorEmail} dir="auto">
                  {entry.actor.email}
                </span>
              )}
            </div>
            {entry.actor.role && (
              <Badge variant={entry.actor.role === 'super_admin' ? 'success' : 'info'} size="sm">
                {t(`audit.role.${entry.actor.role}`, { defaultValue: entry.actor.role })}
              </Badge>
            )}
          </div>
        </section>

        {/* ---- what it happened to ---- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('audit.detail.target')}</h3>
          <dl className={styles.meta}>
            <MetaRow label={t('audit.columns.entityType')} value={fmt.entityLabel(entry.entityType)} />
            <MetaRow
              label={t('audit.detail.entityLabel')}
              value={entry.entityLabel ?? t('audit.detail.emptyValue')}
            />
            {/* The full id, never truncated — the table shortens it, the dialog
                is where an investigator copies it from. */}
            <MetaRow
              label={t('audit.columns.entityId')}
              value={entry.entityId ?? t('audit.detail.unresolvedId')}
              mono
            />
          </dl>
        </section>

        {/* ---- FR-ADM-AUDIT-004: the comparison ---- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('audit.detail.changes')}</h3>
          <AuditDiff before={entry.before} after={entry.after} />
        </section>

        {/* ---- FR-ADM-AUDIT-002: where from ---- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('audit.detail.origin')}</h3>
          <dl className={styles.meta}>
            <MetaRow
              label={t('audit.columns.ip')}
              value={entry.ip ?? t('audit.detail.emptyValue')}
              mono
            />
            {/* The raw user-agent, verbatim. Parsing it into "Chrome on Windows"
                would be a guess, and a guess has no place in an audit record. */}
            <MetaRow
              label={t('audit.detail.device')}
              value={entry.userAgent ?? t('audit.detail.emptyValue')}
              mono
              wrap
            />
          </dl>
        </section>
      </div>
    </Modal>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
  wrap = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className={styles.metaRow}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={clsx(styles.metaValue, mono && styles.mono, wrap && styles.wrap)} dir="auto">
        {value}
      </dd>
    </div>
  );
}
