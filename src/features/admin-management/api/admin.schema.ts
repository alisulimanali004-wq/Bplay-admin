import { z } from 'zod';
import { strongPassword } from '@shared/lib/validation';

/** Syrian national number — exactly 11 digits. */
export const NATIONAL_ID_REGEX = /^[0-9]{11}$/;
/** Syrian mobile local part — 9 digits starting with 9 (the 963 prefix is added by the api). */
export const PHONE_LOCAL_REGEX = /^9[0-9]{8}$/;

const baseAdminSchema = z.object({
  name: z.string().trim().min(2, 'admin.errors.nameRequired'),
  email: z.string().min(1, 'admin.errors.emailRequired').email('admin.errors.emailInvalid'),
  phone: z.string().regex(PHONE_LOCAL_REGEX, 'admin.errors.phoneInvalid'),
  nationalId: z.string().regex(NATIONAL_ID_REGEX, 'admin.errors.nationalIdInvalid'),
  scope: z.enum(['general', 'regional']),
  regionIds: z.array(z.string()),
});

/** A regional admin must manage at least one region; a general admin manages none. */
function requireRegionsWhenRegional(
  data: { scope: 'general' | 'regional'; regionIds: string[] },
  ctx: z.RefinementCtx,
): void {
  if (data.scope === 'regional' && data.regionIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['regionIds'],
      message: 'admin.errors.regionsRequired',
    });
  }
}

/** Create: all fields + the initial password we issue (strong-password rule). */
export const createAdminSchema = baseAdminSchema
  .extend({ password: strongPassword })
  .superRefine(requireRegionsWhenRegional);

/** Edit: same fields minus the password (reset-to-original handles credentials). */
export const editAdminSchema = baseAdminSchema.superRefine(requireRegionsWhenRegional);

/** The form is typed on the create shape; on edit the password field is hidden/ignored. */
export type AdminFormValues = z.infer<typeof createAdminSchema>;

/** Standalone region (re)assignment — an empty array is valid (unassign all). */
export const assignRegionsSchema = z.object({
  regionIds: z.array(z.string()),
});
export type AssignRegionsValues = z.infer<typeof assignRegionsSchema>;
