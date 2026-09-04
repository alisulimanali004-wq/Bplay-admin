import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { regionKeys } from '../api/region.keys';
import {
  createNeighbourhood,
  deleteNeighbourhood,
  getNeighbourhoods,
  toggleNeighbourhoodActive,
  updateNeighbourhood,
} from '../api';
import type { Neighbourhood, NeighbourhoodInput } from '../api/neighbourhood.types';

/**
 * Every neighbourhood, fetched once and filtered per city by the caller.
 *
 * The set is inherently small — it is bounded by the number of cities an
 * operator has drawn — so one request beats a query per city, and it keeps the
 * region detail page to a single round trip.
 */
export function useNeighbourhoods() {
  return useQuery({
    queryKey: regionKeys.neighbourhoods(),
    queryFn: getNeighbourhoods,
  });
}

/** The neighbourhoods of one city, sorted by name. */
export function useNeighbourhoodsByCity(cityId: string | undefined) {
  return useQuery({
    queryKey: regionKeys.neighbourhoods(),
    queryFn: getNeighbourhoods,
    enabled: Boolean(cityId),
    select: (all: Neighbourhood[]) =>
      all
        .filter((neighbourhood) => neighbourhood.cityId === cityId)
        .sort((a, b) => a.name.localeCompare(b.name)),
  });
}

/**
 * Invalidate the whole region prefix after any neighbourhood write.
 *
 * Deliberately broad: a neighbourhood change can move an admin's effective
 * scope, which several other region-derived views read.
 */
function useInvalidateRegions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: regionKeys.all });
}

export function useCreateNeighbourhood() {
  const invalidate = useInvalidateRegions();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (input: NeighbourhoodInput) => createNeighbourhood(input),
    onSuccess: () => {
      invalidate();
      toast.success(t('region.hood.toast.created'));
    },
  });
}

export function useUpdateNeighbourhood() {
  const invalidate = useInvalidateRegions();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NeighbourhoodInput }) =>
      updateNeighbourhood(id, input),
    onSuccess: () => {
      invalidate();
      toast.success(t('region.hood.toast.updated'));
    },
  });
}

export function useToggleNeighbourhood() {
  const invalidate = useInvalidateRegions();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleNeighbourhoodActive(id, isActive),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(
        t(variables.isActive ? 'region.hood.toast.activated' : 'region.hood.toast.deactivated'),
      );
    },
  });
}

export function useDeleteNeighbourhood() {
  const invalidate = useInvalidateRegions();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteNeighbourhood(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('region.hood.toast.deleted'));
    },
  });
}
