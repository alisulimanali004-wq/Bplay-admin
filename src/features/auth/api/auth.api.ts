import { jwtDecode } from 'jwt-decode';
import { apiClient } from '@lib/apiClient';
import { unwrap } from '@shared/types/api';
import { isAppError } from '@shared/lib/errors';
import {
  normalizeRole,
  toAdminMe,
  type AdminMe,
  type AdminMeDto,
  type AuthSession,
  type ForgotInput,
  type LoginInput,
  type ResetInput,
  type UserRole,
} from './auth.types';

/** Claims minted by super-admin/auth.service.js. */
interface AdminJwt {
  sub?: string;
  email?: string;
  role?: string;
  sid?: string;
  exp?: number;
}

interface MeFallback {
  email: string;
  role: UserRole;
}

/**
 * `GET /admin/me` — identity, effective permissions and geographic scope.
 *
 * `token` is only passed during sign-in, when the session is not in the store
 * yet and the request interceptor therefore has nothing to attach.
 */
export async function getMe(fallback: MeFallback, token?: string): Promise<AdminMe> {
  const res = await apiClient.get(
    '/admin/me',
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  return toAdminMe(unwrap<AdminMeDto>(res.data), fallback);
}

/** The claims-only session, used when /admin/me is unavailable. */
function sessionFromToken(accessToken: string, fallback: MeFallback): AuthSession {
  return {
    accessToken,
    role: fallback.role,
    permissions: [],
    user: { email: fallback.email, role: fallback.role },
  };
}

function sessionFromMe(accessToken: string, me: AdminMe): AuthSession {
  return {
    accessToken,
    role: me.role,
    permissions: me.permissions,
    user: {
      email: me.email,
      name: me.name,
      role: me.role,
      avatarUrl: me.avatarUrl,
      scope: me.scope,
      // The dashboard's region-scope selectors read city ids: admin_cities is
      // the backend table that narrows a regional admin's data.
      assignedRegionIds: me.scope.cities.map((city) => city.id),
    },
  };
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const res = await apiClient.post('/admin/login', input);
  const { accessToken } = unwrap<{ accessToken: string }>(res.data);

  const payload = jwtDecode<AdminJwt>(accessToken);
  // Least privilege if the claim is missing or unknown — never assume super_admin.
  const fallback: MeFallback = {
    email: payload.email ?? input.email,
    role: normalizeRole(payload.role, 'admin'),
  };

  try {
    return sessionFromMe(accessToken, await getMe(fallback, accessToken));
  } catch (error) {
    // The credentials were already accepted and a session row exists, so failing
    // the whole sign-in over the profile lookup would strand the admin — and
    // every retry burns one of the five logins allowed per 15 minutes. Degrade
    // to the claims-only session when the route is simply absent (a backend that
    // predates GET /admin/me) or unreachable (a network blip). The degraded
    // session carries NO permissions, so it can only ever be less privileged,
    // never more. An explicit HTTP refusal (401/403/5xx) still fails the login.
    const degradable =
      isAppError(error) && (error.status === 404 || error.status === undefined);
    if (degradable) return sessionFromToken(accessToken, fallback);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/admin/logout');
  } catch {
    /* Best effort: the local session is cleared by the caller either way. */
  }
}

export async function forgotPassword(input: ForgotInput): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email: input.email });
}

export async function resetPassword(input: ResetInput): Promise<void> {
  // The backend names the field `newPassword`.
  await apiClient.post('/auth/reset-password', {
    token: input.token,
    newPassword: input.password,
  });
}
