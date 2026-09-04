import type { ModerationAction, ModerationStatus } from '../api/community.types';

/**
 * Which moderation actions apply to a post/comment in a given state. The
 * reversible tier is status-driven (remove ⇄ restore); hard-delete is always
 * available as the stronger, permanent action.
 */
export function availableModerationActions(status: ModerationStatus): ModerationAction[] {
  const actions: ModerationAction[] = status === 'removed' ? ['restore'] : ['remove'];
  actions.push('delete');
  return actions;
}

/** Only a soft "remove" collects a mandatory reason (via ReasonDialog). */
export function moderationActionNeedsReason(action: ModerationAction): boolean {
  return action === 'remove';
}

/** Dialog / button variant per action — remove is a reversible caution, delete is destructive. */
export function moderationActionVariant(action: ModerationAction): 'primary' | 'danger' | 'caution' {
  if (action === 'remove') return 'caution';
  if (action === 'delete') return 'danger';
  return 'primary';
}

/** Icon-button variant per action for compact row/list clusters (restore is a quiet ghost). */
export const MODERATION_ROW_VARIANT: Record<ModerationAction, 'ghost' | 'caution' | 'danger'> = {
  remove: 'caution',
  restore: 'ghost',
  delete: 'danger',
};
