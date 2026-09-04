import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, BanIcon, PowerIcon } from '@ui';
import { actionVariant, availableActions } from './playerActions';
import { PlayerActionConfirm } from './PlayerActionConfirm';
import type { Player, PlayerAction } from '../api/player.types';
import styles from './playerActions.module.css';

interface Props {
  player: Player;
}

const ACTION_ICON: Record<PlayerAction, ReactNode> = {
  suspend: <PowerIcon />,
  activate: <PowerIcon />,
  block: <BanIcon />,
  unblock: <PowerIcon />,
};

/** Full set of account actions on the player detail header. */
export function PlayerStatusActions({ player }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PlayerAction | null>(null);
  const actions = availableActions(player);

  if (actions.length === 0) return null;

  return (
    <div className={styles.headerActions}>
      {actions.map((action) => {
        const variant = actionVariant(action);
        return (
          <Button
            key={action}
            leftIcon={ACTION_ICON[action]}
            variant={variant === 'primary' ? 'secondary' : variant}
            onClick={() => setPending(action)}
            data-testid={`player-action-${action}`}
          >
            {t(`player.actions.${action}`)}
          </Button>
        );
      })}

      <PlayerActionConfirm player={player} action={pending} onClose={() => setPending(null)} />
    </div>
  );
}
