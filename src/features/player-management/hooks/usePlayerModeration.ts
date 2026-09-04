import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { playerKeys } from '../api/player.keys';
import { liftBookingSuspension, resolvePlayerReport, setPlayerRatingHidden } from '../api';
import type { ReportAction } from '../api/player.types';

/** Hide / un-hide an abusive review the player left. */
export function useRatingModeration(playerId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ ratingId, hidden }: { ratingId: string; hidden: boolean }) =>
      setPlayerRatingHidden(playerId, ratingId, hidden),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.ratings(playerId) });
      toast.success(t(variables.hidden ? 'player.toast.ratingHidden' : 'player.toast.ratingShown'));
    },
  });
}

/** Resolve or dismiss a report tied to the player. */
export function useReportModeration(playerId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ reportId, action, note }: { reportId: string; action: ReportAction; note?: string }) =>
      resolvePlayerReport(playerId, reportId, action, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.reports(playerId) });
      queryClient.invalidateQueries({ queryKey: playerKeys.detail(playerId) });
      toast.success(t(variables.action === 'resolve' ? 'player.toast.reportResolved' : 'player.toast.reportDismissed'));
    },
  });
}

/** Lift the automatic no-show booking suspension for the player. */
export function useLiftBookingSuspension(playerId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => liftBookingSuspension(playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.detail(playerId) });
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
      toast.success(t('player.toast.suspensionLifted'));
    },
  });
}
