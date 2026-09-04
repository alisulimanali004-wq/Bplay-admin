import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isKnownEntityType, isKnownVerb, isStandaloneVerb } from '../api/audit.types';
import type { AuditActor, AuditEntry } from '../api/audit.types';

/**
 * Locale-aware formatting and label derivation for the audit trail. Follows the
 * house convention of an inline `ar-SY` / `en-US` Intl formatter rather than a
 * shared util.
 *
 * The interesting part is `actionLabel`, which implements FR-ADM-AUDIT-005:
 * the label is COMPOSED from the verb and the entity ("Create" + "facility" →
 * "Create facility" / "إنشاء منشأة") rather than stored as prose, because a
 * stored English string would never translate. Anything the vocabulary does not
 * recognise is shown verbatim instead of breaking the row.
 */
export function useAuditFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  return useMemo(() => {
    const dateTime = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const shortDateTime = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const number = new Intl.NumberFormat(locale);

    /** The verb on its own — used when the entity type is unknown. */
    const verbLabel = (action: string): string =>
      isKnownVerb(action) ? t(`audit.verb.${action}`) : action;

    const entityLabel = (entityType: string): string =>
      isKnownEntityType(entityType) ? t(`audit.entity.${entityType}`) : entityType;

    return {
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      shortDateTime: (iso: string) => shortDateTime.format(new Date(iso)),
      number: (value: number) => number.format(value),
      verbLabel,
      entityLabel,

      /** FR-ADM-AUDIT-005 — "إنشاء منشأة" / "Create facility". */
      actionLabel: (action: string, entityType: string): string => {
        if (!action) return entityLabel(entityType);
        if (!entityType || isStandaloneVerb(action)) return verbLabel(action);
        // `audit.actionPattern` lets each language order the two parts itself:
        // English puts the verb first, Arabic reads the same way here, but a
        // language that does not is a translation change, not a code change.
        return t('audit.actionPattern', {
          verb: verbLabel(action),
          entity: entityLabel(entityType),
        });
      },

      /**
       * FR-ADM-AUDIT-003 — a null actor is the platform ("System"); an actor id
       * with no profile left is a deleted account ("Unknown user"). Both are
       * spelled out rather than rendered as an empty cell, because "who did
       * this" is the log's entire reason to exist.
       */
      actorName: (actor: AuditActor): string => {
        if (actor.id === null) return t('audit.actor.system');
        return actor.name?.trim() || t('audit.actor.unknown');
      },

      /** True when the actor has no profile to link or describe. */
      isAnonymousActor: (actor: AuditActor): boolean =>
        actor.id === null || !actor.name?.trim(),

      /** A one-line summary used as the dialog's subtitle. */
      entrySummary: (entry: AuditEntry): string =>
        [entry.entityLabel, entry.entityId].filter(Boolean).join(' · '),
    };
  }, [locale, t]);
}
