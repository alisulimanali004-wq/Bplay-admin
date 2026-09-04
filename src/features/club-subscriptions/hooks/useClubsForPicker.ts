import { useQuery } from '@tanstack/react-query';
import { getFacilities } from '@features/facility-management/api';

/** Every in-scope club (id + name) for the Club filter Select. */
export function useClubsForPicker() {
  return useQuery({
    queryKey: ['facilities', 'clubs', 'picker'],
    queryFn: () => getFacilities({ kind: 'club', page: 1, pageSize: 1000 }),
    select: (result) => result.items.map((facility) => ({ id: facility.id, name: facility.name })),
  });
}
