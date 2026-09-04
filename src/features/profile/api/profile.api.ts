import { apiClient } from '@lib/apiClient';
import { unwrap } from '@shared/types/api';
import {
  toProfileUser,
  type ChangePasswordInput,
  type ProfileUser,
  type ProfileUserDto,
  type UpdateProfileInput,
} from './profile.types';

/** The signed-in admin's own account (super-admin/me). */
const ME_PATH = '/admin/me';

export async function updateProfile(input: UpdateProfileInput): Promise<ProfileUser> {
  // Explicit null clears the photo; the backend leaves an omitted key untouched.
  const res = await apiClient.patch(ME_PATH, {
    name: input.name,
    avatar_url: input.avatarUrl ?? null,
  });
  return toProfileUser(unwrap<ProfileUserDto>(res.data));
}

/**
 * Shared with the mobile app: an admin is a `users` row, so the platform-wide
 * endpoint already verifies the current password, enforces the strength rule,
 * revokes every session and emails a security notice. It signs the admin out of
 * this device too — `useChangePassword` handles that.
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.post(
    '/auth/change-password',
    {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
    },
    // A wrong current password answers 401. Without this opt-out the global
    // interceptor would read that as a dead session and sign the admin out of
    // the whole dashboard for a typo; the modal shows it on the field instead.
    { skipAuthHandling: true },
  );
}
