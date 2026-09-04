import { useQuery } from '@tanstack/react-query';
import { getFacilities } from '@features/facility-management/api';
import { buildFacilityScopeIndex } from '../api/booking.filter';

/**
 * The facility scope index (visible facility ids + region names + orphan flags),
 * used by the detail page to render a booking's facility RegionTag — the Booking
 * entity itself carries no region data. One scoped facilities pull, not a bookings
 * round-trip.
 */
export function useFacilityScopeQuery() {
  return useQuery({
    queryKey: ['facilities', 'scope-index'],
    queryFn: () => getFacilities({ page: 1, pageSize: 1000 }),
    select: (result) => buildFacilityScopeIndex(result.items),
  });
}
