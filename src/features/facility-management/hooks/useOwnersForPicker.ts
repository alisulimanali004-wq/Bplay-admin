import { useQuery } from '@tanstack/react-query';
import { getOwners } from '@features/owner-management/api';
import { ownerState } from '@features/owner-management/api/owner.types';

/**
 * Owners selectable when creating a facility — APPROVED accounts only.
 *
 * `ownerState` resolves the precedence (blocked > suspended > review outcome)
 * from three orthogonal wire signals; there is no single `state` field to read.
 * Only `active` — an owner whose KYC review passed and who is not stopped —
 * survives the filter.
 *
 * Everything else is excluded for a reason:
 *   * blocked / suspended — their existing facilities were deactivated when the
 *     account was stopped, so a NEW facility would be live and bookable under a
 *     banned account and quietly undo the block. The backend refuses this
 *     outright (ERR_OWNER_BLOCKED / ERR_OWNER_SUSPENDED).
 *   * under_review / rejected — an unapproved owner has not passed KYC. Creating
 *     a facility for them puts a venue in the system attributed to an identity
 *     nobody has verified, and it cannot be approved anyway while the owner is
 *     still pending. Approve the owner first, then open their facility.
 *
 * Filtered client-side rather than with the server's `status` parameter because
 * that takes ONE bucket and the mapping is not 1:1 with `ownerState` — the
 * blocked/suspended precedence is resolved here, not on the wire.
 */
export function useOwnersForPicker() {
  return useQuery({
    queryKey: ['owners', 'picker'],
    queryFn: () => getOwners({ page: 1, pageSize: 100 }),
    select: (result) =>
      result.items
        .filter((owner) => ownerState(owner) === 'active')
        .map((owner) => ({ id: owner.id, name: owner.name, email: owner.email })),
  });
}
