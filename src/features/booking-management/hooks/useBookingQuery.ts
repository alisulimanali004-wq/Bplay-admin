import { useQuery } from '@tanstack/react-query';
import { bookingKeys } from '../api/booking.keys';
import { getBookingById } from '../api';

export function useBookingQuery(id: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(id ?? ''),
    queryFn: () => getBookingById(id as string),
    enabled: Boolean(id),
  });
}
