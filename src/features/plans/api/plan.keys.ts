import type { PlanListParams } from './plan.types';

export const planKeys = {
  all: ['plans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
  list: (params: PlanListParams) => [...planKeys.lists(), params] as const,
  details: () => [...planKeys.all, 'detail'] as const,
  detail: (id: string) => [...planKeys.details(), id] as const,
  stats: () => [...planKeys.all, 'stats'] as const,
};
