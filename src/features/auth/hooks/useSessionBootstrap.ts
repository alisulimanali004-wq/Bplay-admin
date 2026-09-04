import { useEffect, useRef } from 'react';
import { useAuthStore } from '@shared/stores/authStore';
import { isAppError } from '@shared/lib/errors';
import { getMe } from '../api';

/**
 * Re-validate a persisted session against the backend, once per app load.
 *
 * The auth store survives a reload in localStorage, so without this the shell
 * renders with whatever role and permissions were true at the last sign-in —
 * even if the admin has since been disabled, had a permission revoked, or the
 * 24-hour session expired. `GET /admin/me` is the cheapest call that proves the
 * session is still live and refreshes name, photo, role, permissions and scope
 * in one round-trip.
 *
 * A 401 is handled globally by the apiClient interceptor (clear + bounce to
 * /login); a 403 means the admin was disabled or their privileges revoked, so
 * we clear here too. Anything else — the backend being briefly unreachable — is
 * left alone: signing an admin out over a flaky network would be worse than
 * showing slightly stale data until the next request.
 */
export function useSessionBootstrap(): void {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const { accessToken, user, role, hydrate, logout } = useAuthStore.getState();
    if (!accessToken || !user) return;

    void getMe({ email: user.email, role: role ?? user.role })
      .then((me) => {
        hydrate({
          user: {
            email: me.email,
            name: me.name,
            role: me.role,
            avatarUrl: me.avatarUrl ?? user.avatarUrl,
            scope: me.scope,
            assignedRegionIds: me.scope.cities.map((city) => city.id),
          },
          permissions: me.permissions,
        });
      })
      .catch((error: unknown) => {
        if (isAppError(error) && error.status === 403) logout();
      });
  }, []);
}
