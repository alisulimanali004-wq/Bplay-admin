import { z } from 'zod';
import { strongPassword } from '@shared/lib/validation';

// Error messages are i18n keys, resolved with t() at render time.
// The strong-password rule lives in shared/lib/validation so auth and profile
// never drift apart.

export const loginSchema = z.object({
  email: z.string().min(1, 'auth.errors.emailRequired').email('auth.errors.emailInvalid'),
  password: strongPassword,
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotSchema = z.object({
  email: z.string().min(1, 'auth.errors.emailRequired').email('auth.errors.emailInvalid'),
});
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string().min(1, 'auth.errors.passwordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.errors.passwordMismatch',
    path: ['confirmPassword'],
  });
export type ResetValues = z.infer<typeof resetSchema>;
