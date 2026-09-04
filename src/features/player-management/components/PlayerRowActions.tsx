import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, EyeIcon, BanIcon, PowerIcon } from '@ui';
import { availableActions } from './playerActions';
import { PlayerActionConfirm } from './PlayerActionConfirm';
import type { Player, PlayerAction } from '../api/player.types';
import styles from './playerActions.module.css';

interface Props {
  player: Player;
  onView: (player: Player) => void;
}

const ACTION_ICON: Record<PlayerAction, ReactNode> = {
  suspend: <PowerIcon />,
  activate: <PowerIcon />,
  block: <BanIcon />,
  unblock: <PowerIcon />,
};

const GHOST_ACTIONS: readonly PlayerAction[] = ['activate', 'unblock'];

/** Row-level actions: View + the account actions valid for this player. */
export function PlayerRowActions({ player, onView }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PlayerAction | null>(null);
  const actions = availableActions(player);

  return (
    <div className={styles.rowActions}>
      <IconButton
        size="sm"
        variant="ghost"
        label={t('player.actions.view')}
        icon={<EyeIcon />}
        onClick={() => onView(player)}
        data-testid={`player-view-${player.id}`}
      />
      {actions.map((action) => (
        <IconButton
          key={action}
          size="sm"
          variant={
            GHOST_ACTIONS.includes(action) ? 'ghost' : action === 'suspend' ? 'caution' : 'danger'
          }
          label={t(`player.actions.${action}`)}
          icon={ACTION_ICON[action]}
          onClick={() => setPending(action)}
          data-testid={`player-${action}-${player.id}`}
        />
      ))}

      <PlayerActionConfirm player={player} action={pending} onClose={() => setPending(null)} />
    </div>
  );
}
