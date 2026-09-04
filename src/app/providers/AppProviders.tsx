import { Suspense, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';
import { Toaster } from '@ui/Toast';
import { AppErrorBoundary } from './AppErrorBoundary';

/**
 * The single provider composition wrapping the whole app:
 * ErrorBoundary > QueryClient > Suspense (lazy routes) + the global Toaster.
 * i18n is initialised as a side-effect import in main.tsx.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>{children}</Suspense>
        <Toaster />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
