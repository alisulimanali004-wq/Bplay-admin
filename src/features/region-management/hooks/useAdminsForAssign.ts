import { useQuery } from '@tanstack/react-query';
import { getAdmins } from '@features/admin-management/api';

/** Small query wrapping getAdmins for the "assign admin" dropdown. */
export function useAdminsForAssign() {
  return useQuery({
    queryKey: ['admins', 'for-assign'],
    queryFn: () => getAdmins({ pageSize: 1000 }),
    // Only REGIONAL admins can manage a region — a general-oversight admin assigned
    // here would create a one-sided link the admin's own detail page can't surface.
    select: (result) =>
      result.items
        .filter((admin) => admin.scope === 'regional')
        .map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        isActive: admin.isActive,
        photoUrl: admin.photoUrl,
      })),
  });
}
