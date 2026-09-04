import type { FacilityAction, FacilityDocument, FacilityStatus } from '../api/facility.types';

/** The minimal facility shape the action components need (Facility or FacilityListItem). */
export interface FacilityActionTarget {
  id: string;
  name: string;
  status: FacilityStatus;
  /** Verification documents — approval is blocked until every one is approved. */
  documents: FacilityDocument[];
}

/**
 * Which admin actions are valid for a facility in a given status (SRS 09 / §8).
 * Note: 'owner_suspended' still allows an admin suspend — the administrative
 * suspension OVERRIDES the owner's pause (SRS FC6). 'rejected' offers nothing:
 * the owner must edit & resubmit from the app.
 */
export function availableActions(status: FacilityStatus): FacilityAction[] {
  switch (status) {
    case 'pending':
      return ['approve', 'reject'];
    case 'active':
      return ['suspend'];
    case 'suspended':
      return ['reactivate'];
    case 'owner_suspended':
      return ['suspend'];
    case 'rejected':
      return [];
  }
}

/**
 * The dialog/button variant for a given action: 'suspend' moves a facility into the
 * Suspended state, so it uses the caution (orange) tone; 'reject' is danger.
 */
export function actionVariant(action: FacilityAction): 'primary' | 'danger' | 'caution' {
  if (action === 'suspend') return 'caution';
  return action === 'approve' || action === 'reactivate' ? 'primary' : 'danger';
}
