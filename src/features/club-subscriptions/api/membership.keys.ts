import type { MembershipListParams } from './membership.types';

export const membershipKeys = {
  all: ['club-subscriptions'] as const,
  lists: () => [...membershipKeys.all, 'list'] as const,
  list: (params: MembershipListParams) => [...membershipKeys.lists(), params] as const,
  stats: () => [...membershipKeys.all, 'stats'] as const,
  details: () => [...membershipKeys.all, 'detail'] as const,
  detail: (id: string) => [...membershipKeys.details(), id] as const,
};
