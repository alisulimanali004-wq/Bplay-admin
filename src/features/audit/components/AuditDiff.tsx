import { useTranslation } from 'react-i18next';
import { ChevronEndIcon, clsx } from '@ui';
import { diffSnapshots, formatAuditValue } from '../api/audit.types';
import type { AuditSnapshot } from '../api/audit.types';
import styles from './auditDiff.module.css';

interface Props {
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
}

/**
 * FR-ADM-AUDIT-004 — the before/after comparison, "كمقارنة مقروءة".
 *
 * Only CHANGED fields are listed. An admin opening a facility update wants the
 * one line that moved, not a 40-row dump where 39 rows are identical — and a
 * diff that shows everything is a diff nobody reads.
 *
 * Every value renders as a plain text node. Snapshots are arbitrary JSON from
 * eleven different modules, so nothing here may ever reach `dangerouslySetInnerHTML`
 * or an `href`; `formatAuditValue` returns a string and this renders that string.
 */
export function AuditDiff({ before, after }: Props) {
  const { t } = useTranslation();
  const changes = diffSnapshots(before, after);
  const empty = t('audit.detail.emptyValue');

  if (changes.length === 0) {
    return <p className={styles.none}>{t('audit.detail.noChanges')}</p>;
  }

  return (
    <ul className={styles.list} data-testid="audit-diff">
      {changes.map((change) => {
        const beforeText = change.kind === 'added' ? empty : formatAuditValue(change.before, empty);
        const afterText = change.kind === 'removed' ? empty : formatAuditValue(change.after, empty);

        return (
          <li key={change.field} className={styles.row}>
            <span className={styles.field} dir="auto">
              {change.field}
            </span>

            <span className={styles.values}>
              {/* A side with no value is muted regardless of the change kind: a
                  struck-through em-dash in a red chip reads as a control, not as
                  "this field was empty". */}
              <span
                className={clsx(styles.value, beforeText === empty ? styles.muted : styles.before)}
                dir="auto"
              >
                {beforeText}
              </span>

              {/* Points from the old value to the new one; `flipInRtl` mirrors it
                  so the direction still reads forward in Arabic. */}
              <ChevronEndIcon className={clsx(styles.arrow, 'flipInRtl')} aria-hidden />

              <span
                className={clsx(styles.value, afterText === empty ? styles.muted : styles.after)}
                dir="auto"
              >
                {afterText}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
