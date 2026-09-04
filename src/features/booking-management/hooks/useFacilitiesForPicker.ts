import { useQuery } from '@tanstack/react-query';
import { getFacilities } from '@features/facility-management/api';

/** All scoped facilities as {id,name} options for the facility filter Select. */
export function useFacilitiesForPicker() {
  return useQuery({
    queryKey: ['facilities', 'picker'],
    queryFn: () => getFacilities({ page: 1, pageSize: 1000 }),
    select: (result) => result.items.map((facility) => ({ id: facility.id, name: facility.name })),
  });
}
