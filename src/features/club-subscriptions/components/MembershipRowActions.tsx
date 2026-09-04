import { useTranslation } from 'react-i18next';
import { IconButton, EyeIcon } from '@ui';
import type { MembershipListItem } from '../api';

export interface MembershipRowActionsProps {
  membership: MembershipListItem;
  onView: (membership: MembershipListItem) => void;
}

/** The single row action for this read-only oversight list: View. */
export function MembershipRowActions({ membership, onView }: MembershipRowActionsProps) {
  const { t } = useTranslation();
  return (
    <IconButton
      variant="ghost"
      size="sm"
      icon={<EyeIcon />}
      label={t('membership.actions.view')}
      onClick={() => onView(membership)}
      data-testid={`membership-view-${membership.id}`}
    />
  );
}
