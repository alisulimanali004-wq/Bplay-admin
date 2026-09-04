import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { planKeys } from '../api/plan.keys';
import { createPlan, deletePlan, movePlan, setPlanActive, updatePlan } from '../api';
import type { CreatePlanInput, UpdatePlanInput } from '../api/plan.types';

// Errors are NOT caught here: queryClient's MutationCache already toasts
// toAppError(error).message, so a local catch would double-toast.

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => createPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success(t('plan.toast.created'));
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlanInput }) => updatePlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success(t('plan.toast.updated'));
    },
  });
}

/** FR-ADM-PLAN-004 — activate / deactivate. Deactivating hides the plan from the apps. */
export function useSetPlanActive() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setPlanActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success(t(variables.isActive ? 'plan.toast.activated' : 'plan.toast.deactivated'));
    },
  });
}

/** Reorder within an audience — the apps read `displayOrder` to rank the tiers. */
export function useMovePlan() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      movePlan(id, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success(t('plan.toast.reordered'));
    },
  });
}

/** PN4 — only ever called for a plan with zero subscribers; the api guards it too. */
export function useDeletePlan() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success(t('plan.toast.deleted'));
    },
  });
}
