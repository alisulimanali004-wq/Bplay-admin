import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import { membershipStatusBadgeVariant, type MembershipStatus } from '../api';

export interface MembershipStatusBadgeProps {
  status: MembershipStatus;
  size?: 'sm' | 'md';
}

/** The one way to render a membership status — shared status→variant mapping + i18n label. */
export function MembershipStatusBadge({ status, size = 'md' }: MembershipStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={membershipStatusBadgeVariant(status)} size={size}>
      {t(`membership.status.${status}`)}
    </Badge>
  );
}
