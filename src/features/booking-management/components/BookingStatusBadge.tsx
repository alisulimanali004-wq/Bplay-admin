import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import { bookingStatusBadgeVariant, type BookingStatus } from '../api/booking.types';

export interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
}

/** The one way to render a booking status — shared status→variant mapping + i18n label. */
export function BookingStatusBadge({ status, size = 'md' }: BookingStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={bookingStatusBadgeVariant(status)} size={size}>
      {t(`booking.status.${status}`)}
    </Badge>
  );
}
