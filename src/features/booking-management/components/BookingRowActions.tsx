import { useTranslation } from 'react-i18next';
import { EyeIcon, IconButton } from '@ui';
import type { BookingListItem } from '../api/booking.types';
import styles from './BookingRowActions.module.css';

export interface BookingRowActionsProps {
  item: BookingListItem;
  onView: (item: BookingListItem) => void;
}

/** Read-only directory row action: a single View button (no governance actions). */
export function BookingRowActions({ item, onView }: BookingRowActionsProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.actions}>
      <IconButton
        size="sm"
        variant="ghost"
        label={t('booking.actions.view')}
        icon={<EyeIcon />}
        onClick={() => onView(item)}
        data-testid={`booking-row-view-${item.id}`}
      />
    </div>
  );
}
