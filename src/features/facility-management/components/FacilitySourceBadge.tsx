import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import type { FacilitySource } from '../api/facility.types';

export interface FacilitySourceBadgeProps {
  source: FacilitySource;
  size?: 'sm' | 'md';
}

/**
 * Marks a facility created BY AN ADMIN from this dashboard — the only facilities
 * an admin may edit here. Renders nothing for owner-created facilities (the
 * common case), so the list stays clean and the mark highlights what's editable.
 */
export function FacilitySourceBadge({ source, size = 'sm' }: FacilitySourceBadgeProps) {
  const { t } = useTranslation();
  if (source !== 'admin') return null;
  return (
    <Badge variant="info" size={size}>
      {t('facility.source.admin')}
    </Badge>
  );
}
