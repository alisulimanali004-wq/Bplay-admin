import { AppProviders } from './providers/AppProviders';
import AppRouter from './router';

/**
 * App root: global providers wrapping the router.
 * The router is still the legacy JSX one during migration; features are moved
 * onto the new data/UI stack one at a time (see /playadmin 06 migration notes).
 */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
