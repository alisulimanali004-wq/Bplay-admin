import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { ownerKeys } from '../api/owner.keys';
import {
  changeOwnerSubscription,
  getOwnerInvoices,
  getOwnerSubscription,
  getPlatformPlans,
} from '../api';
import type { SubscriptionChangeInput } from '../api/subscription.types';

/** The platform plan catalog (Free / Pro / Elite). */
export function usePlatformPlans() {
  return useQuery({
    queryKey: ownerKeys.plans(),
    queryFn: getPlatformPlans,
    staleTime: 5 * 60 * 1000,
  });
}

/** The owner's current platform subscription. */
export function useOwnerSubscription(ownerId: string | undefined) {
  return useQuery({
    queryKey: ownerKeys.subscription(ownerId ?? ''),
    queryFn: () => getOwnerSubscription(ownerId as string),
    enabled: Boolean(ownerId),
  });
}

/** The owner's subscription payment history (invoices). */
export function useOwnerInvoices(ownerId: string | undefined) {
  return useQuery({
    queryKey: ownerKeys.invoices(ownerId ?? ''),
    queryFn: () => getOwnerInvoices(ownerId as string),
    enabled: Boolean(ownerId),
  });
}

/** Upgrade or renew/extend the owner's subscription (never downgrade or cancel). */
export function useChangeOwnerSubscription(ownerId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: SubscriptionChangeInput) => changeOwnerSubscription(ownerId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.subscription(ownerId) });
      queryClient.invalidateQueries({ queryKey: ownerKeys.invoices(ownerId) });
      toast.success(
        t(variables.changeType === 'renewal' ? 'owner.sub.toast.renewed' : 'owner.sub.toast.upgraded'),
      );
    },
  });
}
