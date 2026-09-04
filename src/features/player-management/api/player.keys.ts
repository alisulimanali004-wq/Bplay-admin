import type { PlayerListParams } from './player.types';

export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (params: PlayerListParams) => [...playerKeys.lists(), params] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
  stats: () => [...playerKeys.all, 'stats'] as const,
  subscription: (id: string) => [...playerKeys.all, 'subscription', id] as const,
  rooms: (id: string) => [...playerKeys.all, 'rooms', id] as const,
  ratings: (id: string) => [...playerKeys.all, 'ratings', id] as const,
  reports: (id: string) => [...playerKeys.all, 'reports', id] as const,
  posts: (id: string) => [...playerKeys.all, 'posts', id] as const,
};
