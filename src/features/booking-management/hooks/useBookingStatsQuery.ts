import { useQuery } from '@tanstack/react-query';
import { bookingKeys } from '../api/booking.keys';
import { getBookingStats } from '../api';

/** Scope-aware KPI figures for the directory header (one lightweight call). */
export function useBookingStatsQuery() {
  return useQuery({
    queryKey: bookingKeys.stats(),
    queryFn: () => getBookingStats(),
  });
}
