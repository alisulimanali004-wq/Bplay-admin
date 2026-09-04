import type { FeedbackListParams } from './feedback.types';

export const feedbackKeys = {
  all: ['feedback'] as const,
  lists: () => [...feedbackKeys.all, 'list'] as const,
  list: (params: FeedbackListParams) => [...feedbackKeys.lists(), params] as const,
  details: () => [...feedbackKeys.all, 'detail'] as const,
  detail: (id: string) => [...feedbackKeys.details(), id] as const,
  stats: () => [...feedbackKeys.all, 'stats'] as const,
};
