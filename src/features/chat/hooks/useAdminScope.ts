import { useAssignedRegionIds, useAuthRole } from '@shared/stores/authStore';

/**
 * The signed-in admin's visibility, for the UI (the api layer reads the same
 * values from the store directly). One copy per scoped feature is the house
 * convention — facility-management, feedback and notifications each carry an
 * identical file.
 *
 * `isGeneralOversight` = an admin with NO assigned regions. The established
 * meaning across the dashboard is "sees the whole platform except orphans",
 * NOT "sees nothing" — do not invert it here.
 */
export function useAdminScope() {
  const role = useAuthRole();
  const assignedRegionIds = useAssignedRegionIds();
  const isSuperAdmin = role === 'super_admin';
  const isGeneralOversight =
    role === 'admin' && (!assignedRegionIds || assignedRegionIds.length === 0);
  return { role, isSuperAdmin, isGeneralOversight, assignedRegionIds };
}
