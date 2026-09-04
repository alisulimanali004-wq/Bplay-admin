import type { BadgeVariant } from '@ui/Badge/Badge';

/**
 * The single mapping from a domain status string to a Badge variant.
 * Every status render uses this — never inline-pick a variant.
 */
export function statusToBadgeVariant(status: string | null | undefined): BadgeVariant {
  const s = (status ?? '').toLowerCase();
  if (['active', 'approved', 'paid', 'confirmed', 'success', 'completed', 'verified'].includes(s)) {
    return 'success';
  }
  if (['pending', 'review', 'under_review', 'processing', 'in_review'].includes(s)) {
    return 'warning';
  }
  // "Suspended" family — a reversible, attention-worthy paused state. Its own
  // (orange) colour so it never reads as terminal red (deleted/blocked/rejected)
  // nor as calm neutral grey. Both 'suspended' and 'inactive' surface as Suspended.
  if (['suspended', 'inactive'].includes(s)) {
    return 'caution';
  }
  if (['rejected', 'owner_suspended', 'blocked', 'failed', 'banned', 'expired'].includes(s)) {
    return 'danger';
  }
  if (['maintenance', 'cancelled', 'canceled', 'disabled', 'archived'].includes(s)) {
    return 'neutral';
  }
  return 'info';
}
