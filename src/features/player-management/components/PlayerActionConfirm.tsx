import { useTranslation } from 'react-i18next';
import { ConfirmDialog, ReasonDialog } from '@ui';
import { actionNeedsReason, actionVariant } from './playerActions';
import { usePlayerActions } from '../hooks/usePlayerActions';
import type { Player, PlayerAction } from '../api/player.types';

interface Props {
  player: Player;
  action: PlayerAction | null;
  onClose: () => void;
}

/** Runs a single player action — a reason dialog for suspend/block, a plain confirm otherwise. */
export function PlayerActionConfirm({ player, action, onClose }: Props) {
  const { t } = useTranslation();
  const mutation = usePlayerActions();

  if (!action) return null;

  const variant = actionVariant(action);
  const run = (reason?: string) =>
    mutation.mutate({ id: player.id, action, reason }, { onSuccess: onClose });

  if (actionNeedsReason(action)) {
    return (
      <ReasonDialog
        isOpen
        onClose={onClose}
        onConfirm={(reason) => run(reason)}
        title={t(`player.confirm.${action}.title`)}
        description={t(`player.confirm.${action}.message`, { name: player.name })}
        reasonLabel={t('player.confirm.reasonLabel')}
        reasonPlaceholder={t('player.confirm.reasonPlaceholder')}
        confirmText={t(`player.actions.${action}`)}
        cancelText={t('common.cancel')}
        variant={variant}
        isLoading={mutation.isPending}
      />
    );
  }

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={() => run()}
      title={t(`player.confirm.${action}.title`)}
      message={t(`player.confirm.${action}.message`, { name: player.name })}
      confirmText={t(`player.actions.${action}`)}
      variant={variant}
      isLoading={mutation.isPending}
    />
  );
}
