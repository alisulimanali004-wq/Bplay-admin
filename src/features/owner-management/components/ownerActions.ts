import type { Owner, OwnerAction } from '../api/owner.types';

/**
 * Which account-level actions are valid for an owner. A blocked owner offers
 * only "unblock"; otherwise the set follows the account status, plus "block".
 * Mirrors the transitions `updateAccountLifecycle` accepts server-side.
 */
export function availableActions(owner: Owner): OwnerAction[] {
  if (owner.isBlocked) return ['unblock'];

  const actions: OwnerAction[] = [];
  switch (owner.accountStatus) {
    case 'under_review':
      actions.push('approve', 'reject');
      break;
    case 'rejected':
      actions.push('approve');
      break;
    case 'active':
      actions.push('suspend');
      break;
    case 'suspended':
      actions.push('activate');
      break;
  }
  actions.push('block');
  return actions;
}

/** An action plus, when it cannot run yet, the reason to show instead of a 400. */
export interface OwnerActionState {
  action: OwnerAction;
  disabled: boolean;
  /** i18n key explaining the block — pass through `t()` with `reasonParams`. */
  reasonKey?: string;
  reasonParams?: { count: number };
}

/**
 * The backend refuses to approve an account until every uploaded document has
 * been approved, and refuses outright when none were uploaded
 * (ERR_NO_DOCUMENTS / ERR_INCOMPLETE_DOCS). Surfacing that as a disabled button
 * with the reason beats letting the admin click and read an error.
 *
 * Only decidable where the documents are actually loaded — the list endpoint
 * returns none, so there the button stays live and the backend's own (localised)
 * message explains any refusal.
 */
export function approveGate(owner: Owner): Pick<OwnerActionState, 'reasonKey' | 'reasonParams'> | null {
  if (!owner.documentsLoaded) return null;

  if (owner.documents.length === 0) {
    return { reasonKey: 'owner.gate.noDocuments' };
  }

  const pending = owner.documents.filter((doc) => doc.status === 'under_review').length;
  if (pending > 0) {
    return { reasonKey: 'owner.gate.pendingDocs', reasonParams: { count: pending } };
  }

  const rejected = owner.documents.filter((doc) => doc.status === 'rejected').length;
  if (rejected > 0) {
    return { reasonKey: 'owner.gate.rejectedDocs', reasonParams: { count: rejected } };
  }

  return null;
}

/** The valid actions for an owner, each carrying its own gate state. */
export function ownerActionStates(owner: Owner): OwnerActionState[] {
  return availableActions(owner).map((action) => {
    const gate = action === 'approve' ? approveGate(owner) : null;
    return gate ? { action, disabled: true, ...gate } : { action, disabled: false };
  });
}

/** Actions that require a mandatory reason (opened via ReasonDialog). */
export function actionNeedsReason(action: OwnerAction): boolean {
  return action === 'reject' || action === 'suspend' || action === 'block';
}

/** ConfirmDialog / button variant per action. */
export function actionVariant(action: OwnerAction): 'primary' | 'danger' | 'caution' {
  if (action === 'suspend') return 'caution';
  return action === 'reject' || action === 'block' ? 'danger' : 'primary';
}
