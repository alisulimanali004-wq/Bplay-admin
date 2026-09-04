import { useQuery } from '@tanstack/react-query';
import { communityKeys } from '../api/community.keys';
import { getPostById } from '../api';

export function usePostQuery(id: string | undefined) {
  return useQuery({
    queryKey: communityKeys.detail(id ?? ''),
    queryFn: () => getPostById(id as string),
    enabled: Boolean(id),
  });
}
