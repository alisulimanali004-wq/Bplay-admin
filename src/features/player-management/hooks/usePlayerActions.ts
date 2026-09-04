import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { playerKeys } from '../api/player.keys';
import { updatePlayerStatus } from '../api';
import type { PlayerAction } from '../api/player.types';

/** suspend / activate / block / unblock — reason mandatory for suspend + block. */
export function usePlayerActions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: PlayerAction; reason?: string }) =>
      updatePlayerStatus(id, action, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
      toast.success(t(`player.toast.${variables.action}`));
    },
  });
}
