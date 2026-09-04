import type { AuthUser } from '@shared/stores/authStore';

/** The editable slice of the signed-in admin's profile. */
export type ProfileUser = Pick<AuthUser, 'name' | 'avatarUrl'>;

/** Wire shape of `PATCH /admin/me` (snake_case). */
export interface ProfileUserDto {
  name?: string | null;
  avatar_url?: string | null;
}

export function toProfileUser(dto: ProfileUserDto): ProfileUser {
  return { name: dto.name ?? undefined, avatarUrl: dto.avatar_url ?? undefined };
}

export interface UpdateProfileInput {
  name: string;
  /** Data URL / remote URL of the new photo; undefined removes the photo. */
  avatarUrl?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  /** The backend re-checks the match itself, so it is sent rather than dropped. */
  confirmPassword: string;
}
