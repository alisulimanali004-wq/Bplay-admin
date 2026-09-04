import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

export type UserRole = 'super_admin' | 'admin';

/** A city or neighbourhood the admin's data is narrowed to. */
export interface ScopeArea {
  id: string;
  name: string;
}

/**
 * The admin's geographic scope, as the backend resolves it
 * (`GET /admin/me` → `scope`). `all` means unscoped — super_admin sees every
 * city and neighbourhood, so the area lists are empty by design, not by
 * omission.
 */
export interface AdminScope {
  all: boolean;
  cities: ScopeArea[];
  neighbourhoods: ScopeArea[];
}

export interface AuthUser {
  email: string;
  name?: string;
  role: UserRole;
  /** Data URL or remote URL of the profile photo; undefined = initials fallback. */
  avatarUrl?: string;
  /** Scope-region ids for regional admins; empty/undefined admin = general oversight. */
  assignedRegionIds?: string[];
  /** The full backend scope this session resolved to. */
  scope?: AdminScope;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  role: UserRole;
  /** Effective permission slugs (`view-owners`, `update-owners`, …). */
  permissions?: string[];
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  role: UserRole | null;
  /** Effective permission slugs; super_admin holds every one. */
  permissions: string[];
  isAuthenticated: boolean;
  /** Persist a full session (called by the login flow). */
  login: (session: AuthSession) => void;
  /** Clear the session (logout / 401). */
  logout: () => void;
  /** Set/refresh the token and re-derive the role from its JWT payload. */
  setToken: (token: string) => void;
  /**
   * Refresh identity/role/permissions from `GET /admin/me` without touching the
   * token — used on reload to re-validate a persisted session against the
   * server, so a revoked admin cannot keep a stale role or permission set.
   */
  hydrate: (patch: {
    user: Partial<AuthUser> & { role?: UserRole };
    permissions?: string[];
  }) => void;
  /** Patch the current user's editable profile fields (name / avatar). */
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'avatarUrl'>>) => void;
}

interface JwtPayload {
  role?: UserRole;
  email?: string;
  name?: string;
  assignedRegionIds?: string[];
}

function decodePayload(token: string): JwtPayload {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return {};
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      role: null,
      permissions: [],
      isAuthenticated: false,
      login: (session) =>
        set({
          accessToken: session.accessToken,
          user: session.user,
          role: session.role,
          permissions: session.permissions ?? [],
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          accessToken: null,
          user: null,
          role: null,
          permissions: [],
          isAuthenticated: false,
        }),
      setToken: (token) =>
        set((state) => {
          const payload = decodePayload(token);
          return {
            accessToken: token,
            role: payload.role ?? state.role,
            user: state.user
              ? {
                  ...state.user,
                  assignedRegionIds: payload.assignedRegionIds ?? state.user.assignedRegionIds,
                }
              : state.user,
            isAuthenticated: true,
          };
        }),
      hydrate: ({ user, permissions }) =>
        set((state) => {
          if (!state.user) return {};
          const role = user.role ?? state.role ?? state.user.role;
          return {
            user: { ...state.user, ...user, role },
            role,
            permissions: permissions ?? state.permissions,
          };
        }),
      updateProfile: (patch) =>
        set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
    }),
    { name: 'bplay-admin-auth' },
  ),
);

// Selector hooks — components subscribe to a single slice, never the whole store.
export const useAccessToken = (): string | null => useAuthStore((s) => s.accessToken);
export const useAuthUser = (): AuthUser | null => useAuthStore((s) => s.user);
export const useAuthRole = (): UserRole | null => useAuthStore((s) => s.role);
export const useIsAuthenticated = (): boolean => useAuthStore((s) => s.isAuthenticated);
export const useAssignedRegionIds = (): string[] | undefined =>
  useAuthStore((s) => s.user?.assignedRegionIds);
export const useAdminScopeAreas = (): AdminScope | undefined => useAuthStore((s) => s.user?.scope);

/**
 * Whether the signed-in admin holds a permission slug. super_admin bypasses the
 * check exactly as the backend does (plugins/authorize.js), so the UI never
 * offers an action the API would then refuse — nor hides one it would allow.
 */
export function useHasPermission(slug: string): boolean {
  return useAuthStore((s) => s.role === 'super_admin' || s.permissions.includes(slug));
}

/** Non-reactive read, for use outside React (services, guards). */
export function hasPermission(slug: string): boolean {
  const { role, permissions } = useAuthStore.getState();
  return role === 'super_admin' || permissions.includes(slug);
}
