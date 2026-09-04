import { z } from 'zod';

const PHONE_LOCAL_REGEX = /^9[0-9]{8}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Admin-created player. The fields mirror `createPlayerSchema` on the backend
 * exactly — it declares `additionalProperties: false`, so anything not listed
 * there fails the request rather than being ignored.
 *
 * `dateOfBirth` is genuinely optional server-side; everything else is required.
 */
export const createPlayerSchema = z.object({
  fullName: z.string().trim().min(3, 'player.errors.nameRequired'),
  username: z
    .string()
    .trim()
    .min(3, 'player.errors.usernameRequired')
    .regex(USERNAME_REGEX, 'player.errors.usernameInvalid'),
  email: z.string().min(1, 'player.errors.emailRequired').email('player.errors.emailInvalid'),
  // Local part only — the api layer prepends the country code, exactly as the
  // owner form does, so the two stay consistent.
  phone: z.string().regex(PHONE_LOCAL_REGEX, 'player.errors.phoneInvalid'),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'player.errors.genderRequired',
  }),
  // An empty date input yields '', which is not a valid date — allow it through
  // as "not provided" rather than failing validation on an untouched field.
  dateOfBirth: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'player.errors.dobInvalid'),
});

export type CreatePlayerValues = z.infer<typeof createPlayerSchema>;
