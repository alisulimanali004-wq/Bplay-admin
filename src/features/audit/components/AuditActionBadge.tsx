import { useTranslation } from 'react-i18next';
import {
  Badge,
  BuildingIcon,
  CalendarIcon,
  CreditCardIcon,
  GlobeIcon,
  InboxIcon,
  LayersIcon,
  MessageCircleIcon,
  SendIcon,
  StadiumIcon,
  TrophyIcon,
  UsersIcon,
} from '@ui';
import type { ComponentType, SVGProps } from 'react';
import { auditActionBadgeVariant } from '../api/audit.types';
import { useAuditFormat } from '../hooks/useAuditFormat';

/**
 * FR-ADM-AUDIT-005 — the coloured action label.
 *
 * The palette is intentionally minimal (AUD5): create is green, delete is red,
 * everything else neutral. Colour never carries the meaning on its own — the
 * label always spells the action out — so a colour-blind reader loses nothing.
 */
export function AuditActionBadge({
  action,
  entityType,
}: {
  action: string;
  entityType: string;
}) {
  const fmt = useAuditFormat();
  return (
    <Badge variant={auditActionBadgeVariant(action)} size="sm">
      {fmt.actionLabel(action, entityType)}
    </Badge>
  );
}

type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * The entity-type glyph. Reuses each module's own sidebar icon, so a row about a
 * facility carries the same mark the Facilities page does — the log reads as
 * part of the dashboard rather than as a separate database view.
 */
const ENTITY_ICON: Record<string, Glyph> = {
  admin: UsersIcon,
  owner: BuildingIcon,
  player: TrophyIcon,
  facility: StadiumIcon,
  region: GlobeIcon,
  plan: LayersIcon,
  booking: CalendarIcon,
  subscription: CreditCardIcon,
  post: MessageCircleIcon,
  feedback: InboxIcon,
  conversation: SendIcon,
};

export function AuditEntityCell({
  entityType,
  className,
}: {
  entityType: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const fmt = useAuditFormat();
  const Icon = ENTITY_ICON[entityType];
  const label = fmt.entityLabel(entityType);

  return (
    <span className={className}>
      {Icon && <Icon aria-hidden />}
      <span>{label || t('common.emptyDefault')}</span>
    </span>
  );
}
