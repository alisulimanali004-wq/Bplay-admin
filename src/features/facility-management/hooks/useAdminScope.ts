import { useAssignedRegionIds, useAuthRole } from '@shared/stores/authStore';

/**
 * The signed-in admin's facility-visibility scope, derived from the auth store.
 * An admin with no assigned regions is "general oversight" (sees all non-orphans).
 */
export function useAdminScope() {
  const role = useAuthRole();
  const assignedRegionIds = useAssignedRegionIds();
  const isSuperAdmin = role === 'super_admin';
  const isGeneralOversight =
    role === 'admin' && (!assignedRegionIds || assignedRegionIds.length === 0);
  return { role, isSuperAdmin, isGeneralOversight, assignedRegionIds };
}
