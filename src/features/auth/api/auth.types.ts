import type { AdminScope, AuthSession, UserRole } from '@shared/stores/authStore';

export type { AdminScope, AuthSession, UserRole };

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotInput {
  email: string;
}

export interface ResetInput {
  token: string;
  password: string;
}

/** Wire shape of `GET /admin/me` (snake_case), normalised by `toAdminMe`. */
export interface AdminMeDto {
  id?: string;
  email?: string;
  phone?: string | null;
  name?: string | null;
  national_id?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_active?: boolean;
  permissions?: string[];
  scope?: {
    all?: boolean;
    cities?: Array<{ id?: string; name?: string }>;
    neighbourhoods?: Array<{ id?: string; name?: string }>;
  };
  created_at?: string;
}

/** The signed-in admin's identity, effective permissions and geographic scope. */
export interface AdminMe {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: string[];
  scope: AdminScope;
}

/** Only these two roles may sign in to the dashboard; anything else is a defect. */
const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin'];

export function normalizeRole(value: string | null | undefined, fallback: UserRole): UserRole {
  return (ADMIN_ROLES as string[]).includes(value ?? '') ? (value as UserRole) : fallback;
}

export function toAdminMe(dto: AdminMeDto, fallback: { email: string; role: UserRole }): AdminMe {
  const areas = (list: Array<{ id?: string; name?: string }> | undefined) =>
    (list ?? [])
      .filter((area): area is { id: string; name?: string } => Boolean(area.id))
      .map((area) => ({ id: area.id, name: area.name ?? '' }));

  const cities = areas(dto.scope?.cities);
  const neighbourhoods = areas(dto.scope?.neighbourhoods);

  return {
    id: dto.id ?? '',
    email: dto.email ?? fallback.email,
    // The bootstrap super admin has no admin_profiles row, so a null name is
    // normal — the header falls back to the email.
    name: dto.name ?? undefined,
    avatarUrl: dto.avatar_url ?? undefined,
    role: normalizeRole(dto.role, fallback.role),
    permissions: dto.permissions ?? [],
    scope: { all: dto.scope?.all ?? false, cities, neighbourhoods },
  };
}
