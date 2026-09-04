import { mockDelay } from '@shared/lib/mock';
import type { ChangePasswordInput, ProfileUser, UpdateProfileInput } from './profile.types';

export async function updateProfile(input: UpdateProfileInput): Promise<ProfileUser> {
  await mockDelay();
  return { name: input.name.trim(), avatarUrl: input.avatarUrl };
}

export async function changePassword(_input: ChangePasswordInput): Promise<void> {
  await mockDelay();
  // The live backend verifies the current password and may return a field error,
  // which the form maps back onto the "current password" field. The mock stores
  // no password, so it always succeeds.
}
