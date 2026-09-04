import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import { bookingSourceBadgeVariant, type BookingSource } from '../api/booking.types';

export interface BookingSourceBadgeProps {
  source: BookingSource;
  size?: 'sm' | 'md';
}

/** How the booking entered the system: electronic / manual / private (block). */
export function BookingSourceBadge({ source, size = 'md' }: BookingSourceBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={bookingSourceBadgeVariant(source)} size={size}>
      {t(`booking.source.${source}`)}
    </Badge>
  );
}
