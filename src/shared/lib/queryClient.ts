import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { isAppError, isNotFoundError } from './errors';
import { translateError } from './errorMessage';
import { toast } from '@ui/Toast';

/**
 * Global query client. Defaults are canonical (see /playadmin 09-conventions):
 * staleTime 30s, no refetch-on-focus. Any query/mutation error that isn't handled
 * locally surfaces as a toast — except expected "not found" outcomes, which detail
 * pages render inline as an EmptyState.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Never retry a 4xx (a not-found or bad-request won't succeed on a retry) —
      // retrying only delays the inline not-found state and doubles the request.
      // Retry once for everything else (5xx / network blips).
      retry: (failureCount, error) => {
        if (isNotFoundError(error)) return false;
        if (isAppError(error) && error.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    // "Not found" is an expected outcome the detail pages render inline — don't toast it.
    onError: (error) => {
      if (isNotFoundError(error)) return;
      toast.error(translateError(error));
    },
  }),
  mutationCache: new MutationCache({
    // A mutation may opt out with `meta: { silentError: true }` when its own UI
    // already renders the failure AND offers the recovery — e.g. a chat bubble
    // that stays in the thread marked "failed" with a retry button. Everything
    // else toasts; silence is the exception, never the default.
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silentError) return;
      toast.error(translateError(error));
    },
  }),
});
