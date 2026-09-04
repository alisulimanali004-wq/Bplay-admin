import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { playerKeys } from '../api/player.keys';
import { createPlayer } from '../api';
import type { CreatePlayerInput } from '../api/player.types';

/** Create a player account with a one-time temporary password. */
export function useCreatePlayer() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: CreatePlayerInput) => createPlayer(input),
    onSuccess: () => {
      // `all`, not just the lists: the stats tiles above the table are derived
      // from their own query and would keep showing the pre-create counts.
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
      toast.success(t('player.toast.created'));
    },
  });
}
