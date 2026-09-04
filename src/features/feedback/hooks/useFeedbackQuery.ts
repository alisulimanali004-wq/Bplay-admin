import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { feedbackKeys } from '../api/feedback.keys';
import { getFeedbackById, getFeedbackList, getFeedbackStats } from '../api';
import type { FeedbackListParams } from '../api/feedback.types';

export function useFeedbackListQuery(params: FeedbackListParams) {
  return useQuery({
    queryKey: feedbackKeys.list(params),
    queryFn: () => getFeedbackList(params),
    placeholderData: keepPreviousData,
  });
}

/** Single item for the detail page. Disabled until an id is present. */
export function useFeedbackQuery(id?: string) {
  return useQuery({
    queryKey: feedbackKeys.detail(id ?? ''),
    queryFn: () => getFeedbackById(id!),
    enabled: Boolean(id),
  });
}

/** Inbox counters across everything the signed-in admin may see. */
export function useFeedbackStats() {
  return useQuery({
    queryKey: feedbackKeys.stats(),
    queryFn: () => getFeedbackStats(),
  });
}
