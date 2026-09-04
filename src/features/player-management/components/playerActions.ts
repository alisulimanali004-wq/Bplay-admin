import type { Player, PlayerAction } from '../api/player.types';

/**
 * Which account-level actions are valid for a player. A blocked player offers
 * only "unblock"; otherwise the set follows the account status, plus "block".
 * (Players self-register, so there is no approve/reject onboarding gate.)
 */
export function availableActions(player: Player): PlayerAction[] {
  if (player.isBlocked) return ['unblock'];

  const actions: PlayerAction[] = [];
  if (player.accountStatus === 'active') actions.push('suspend');
  else actions.push('activate');
  actions.push('block');
  return actions;
}

/** Actions that require a mandatory reason (opened via ReasonDialog). */
export function actionNeedsReason(action: PlayerAction): boolean {
  return action === 'suspend' || action === 'block';
}

/** ConfirmDialog / button variant per action (suspend = reversible caution). */
export function actionVariant(action: PlayerAction): 'primary' | 'danger' | 'caution' {
  if (action === 'suspend') return 'caution';
  return action === 'block' ? 'danger' : 'primary';
}
