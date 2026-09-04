import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAuthenticated, useAuthRole, type UserRole } from '@shared/stores/authStore';
import { PATHS } from './paths';

/** Gate a route on an authenticated session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to={PATHS.login} replace />;
}

/** Gate a route on a specific role (super_admin-only areas). */
export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const current = useAuthRole();
  if (!isAuthenticated) return <Navigate to={PATHS.login} replace />;
  if (current !== role) return <Navigate to={PATHS.profile} replace />;
  return <>{children}</>;
}

/** Gate a route on any of several roles (e.g. facility management: super_admin + admin). */
export function RequireAnyRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const current = useAuthRole();
  if (!isAuthenticated) return <Navigate to={PATHS.login} replace />;
  if (!current || !roles.includes(current)) return <Navigate to={PATHS.profile} replace />;
  return <>{children}</>;
}
