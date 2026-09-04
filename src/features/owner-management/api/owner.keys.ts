import type { OwnerListParams } from './owner.types';

export const ownerKeys = {
  all: ['owners'] as const,
  lists: () => [...ownerKeys.all, 'list'] as const,
  list: (params: OwnerListParams) => [...ownerKeys.lists(), params] as const,
  details: () => [...ownerKeys.all, 'detail'] as const,
  detail: (id: string) => [...ownerKeys.details(), id] as const,
  stats: () => [...ownerKeys.all, 'stats'] as const,
  facilities: (id: string) => [...ownerKeys.all, 'facilities', id] as const,
  plans: () => [...ownerKeys.all, 'plans'] as const,
  subscription: (id: string) => [...ownerKeys.all, 'subscription', id] as const,
  invoices: (id: string) => [...ownerKeys.all, 'invoices', id] as const,
  posts: (id: string) => [...ownerKeys.all, 'posts', id] as const,
};
