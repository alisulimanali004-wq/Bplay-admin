import { z } from 'zod';

/**
 * A strong password: at least 8 characters with an uppercase letter, a number
 * and a special character. The single source of the rule — shared by auth
 * (login / reset) and profile (change password) so it never drifts. Messages
 * are i18n keys, resolved with t() at render time.
 */
export const strongPassword = z
  .string()
  .min(1, 'auth.errors.passwordRequired')
  .min(8, 'auth.errors.passwordShort')
  .regex(/[A-Z]/, 'auth.errors.passwordComplexity')
  .regex(/[0-9]/, 'auth.errors.passwordComplexity')
  .regex(/[^A-Za-z0-9]/, 'auth.errors.passwordComplexity');
