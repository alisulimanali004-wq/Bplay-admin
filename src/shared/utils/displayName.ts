import type { AuthUser } from '@shared/stores/authStore';

/** The last-resort label when an account has neither a name nor an email. */
const FALLBACK = 'Admin';

/** Segment separators inside an email handle: `yazbek.ali.2003`, `omar_h`, `a-b`. */
const HANDLE_SEPARATORS = /[._-]/;

/**
 * The name to show for the signed-in admin.
 *
 * `GET /admin/me` does not always return a name someone chose. `admin_profiles`
 * is created on the first profile save, not on account creation, so for every
 * account that has never opened Profile the backend falls back to
 * `split_part(email, '@', 1)` (me.service.js). The header and sidebar then
 * rendered raw handles — `yazbek.ali.2003` — as if they were names.
 *
 * A handle is not a name, so when the value IS still the email's local part we
 * keep only its first segment. Nothing is lost: the sidebar prints the full
 * address directly underneath it.
 *
 * A name the admin actually saved is returned untouched, however it is
 * punctuated — the shortening is scoped to the fallback, not applied to
 * everyone.
 */
export function displayName(
  user: Pick<AuthUser, 'name' | 'email'> | null | undefined,
): string {
  const localPart = (user?.email ?? '').split('@')[0];
  const raw = user?.name?.trim() || localPart;
  if (!raw) return FALLBACK;

  // Only a value that is still the email handle gets shortened.
  if (raw !== localPart) return raw;

  return raw.split(HANDLE_SEPARATORS)[0] || raw;
}

/** The greeting form — first name only ("Good evening, yazbek"). */
export function firstName(
  user: Pick<AuthUser, 'name' | 'email'> | null | undefined,
): string {
  return displayName(user).split(' ')[0];
}
