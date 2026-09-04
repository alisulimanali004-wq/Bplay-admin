import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { regionKeys } from '../api/region.keys';
import {
  assignAdmins,
  createRegion,
  deleteRegion,
  restoreRegion,
  toggleRegionActive,
  updateRegion,
} from '../api';
import type { CreateRegionInput, UpdateRegionInput } from '../api/region.types';

export function useCreateRegion() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (input: CreateRegionInput) => createRegion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.all });
      toast.success(t('region.toast.created'));
    },
  });
}

export function useUpdateRegion() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRegionInput }) =>
      updateRegion(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.all });
      toast.success(t('region.toast.updated'));
    },
  });
}

export function useToggleRegion() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleRegionActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: regionKeys.all });
      toast.success(t(variables.isActive ? 'region.toast.activated' : 'region.toast.deactivated'));
    },
  });
}

/** Many-to-many assignment — replaces the whole admin set for a region. */
export function useAssignAdmins() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      adminIds,
      adminNames,
    }: {
      id: string;
      adminIds: string[];
      adminNames: string[];
    }) => assignAdmins(id, adminIds, adminNames),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.all });
      toast.success(t('region.toast.assigned'));
    },
  });
}

export function useDeleteRegion() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteRegion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.all });
      toast.success(t('region.toast.deleted'));
    },
  });
}

export function useRestoreRegion() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => restoreRegion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.all });
      toast.success(t('region.toast.restored'));
    },
  });
}
