import type { PostListParams } from './community.types';

export const communityKeys = {
  all: ['posts'] as const,
  lists: () => [...communityKeys.all, 'list'] as const,
  list: (params: PostListParams) => [...communityKeys.lists(), params] as const,
  details: () => [...communityKeys.all, 'detail'] as const,
  detail: (id: string) => [...communityKeys.details(), id] as const,
  stats: () => [...communityKeys.all, 'stats'] as const,
  comments: (postId: string) => [...communityKeys.all, 'comments', postId] as const,
  reactors: (postId: string) => [...communityKeys.all, 'reactors', postId] as const,
};
