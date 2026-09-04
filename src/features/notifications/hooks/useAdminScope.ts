import { useAssignedRegionIds, useAuthRole } from '@shared/stores/authStore';

/**
 * The signed-in admin's visibility, for the UI (the api layer reads the same
 * values from the store directly). One copy per scoped feature is the house
 * convention — facility-management, booking-management, club-subscriptions and
 * feedback each carry an identical file.
 *
 * `isGeneralOversight` = an admin with NO assigned regions. For NOTIFICATIONS
 * that means "not region-restricted" — every row here was addressed to this
 * admin by the server in the first place. See the gate in notification.filter.ts
 * for why this differs from feedback's "everything except orphans".
 */
export function useAdminScope() {
  const role = useAuthRole();
  const assignedRegionIds = useAssignedRegionIds();
  const isSuperAdmin = role === 'super_admin';
  const isGeneralOversight =
    role === 'admin' && (!assignedRegionIds || assignedRegionIds.length === 0);
  return { role, isSuperAdmin, isGeneralOversight, assignedRegionIds };
}
