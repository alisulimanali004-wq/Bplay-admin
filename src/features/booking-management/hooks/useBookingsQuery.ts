import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { bookingKeys } from '../api/booking.keys';
import { getBookings } from '../api';
import type { BookingListParams } from '../api/booking.types';

export function useBookingsQuery(params: BookingListParams) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => getBookings(params),
    placeholderData: keepPreviousData,
  });
}
