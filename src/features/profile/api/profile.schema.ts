import { z } from 'zod';
import { strongPassword } from '@shared/lib/validation';

export const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'profile.errors.nameRequired')
    .max(60, 'profile.errors.nameTooLong'),
});
export type EditProfileValues = z.infer<typeof editProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'profile.errors.currentRequired'),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, 'auth.errors.passwordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'auth.errors.passwordMismatch',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'profile.errors.samePassword',
    path: ['newPassword'],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
