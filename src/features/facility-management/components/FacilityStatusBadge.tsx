import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import type { FacilityStatus } from '../api/facility.types';

export interface FacilityStatusBadgeProps {
  status: FacilityStatus;
  size?: 'sm' | 'md';
}

/** The one way to render a facility status — shared status→variant mapping + i18n label. */
export function FacilityStatusBadge({ status, size = 'md' }: FacilityStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={statusToBadgeVariant(status)} size={size}>
      {t(`status.${status}`)}
    </Badge>
  );
}
