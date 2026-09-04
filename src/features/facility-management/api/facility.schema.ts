import { z } from 'zod';
import { FACILITY_DOC_TYPES, SPORT_TYPES, type SportType } from './facility.types';

// Enum schemas kept in sync with facility.types (literal tuples for zod).
const kindEnum = z.enum(['club', 'pitch']);
/**
 * DERIVED from `SPORT_TYPES`, not retyped.
 *
 * This was a hand-copied literal tuple, and it drifted: the type gained the six
 * remaining seeded sports while this list kept only the original six, so the
 * wizard rejected a Badminton court that the rest of the app accepted. Reading
 * the single source means the two cannot disagree again.
 */
const sportEnum = z.enum(SPORT_TYPES as [SportType, ...SportType[]]);
const surfaceEnum = z.enum(['grass', 'artificial', 'hardcourt', 'clay', 'sand']);
const governorateEnum = z.enum([
  'damascus',
  'rif_dimashq',
  'aleppo',
  'homs',
  'hama',
  'latakia',
  'tartus',
  'idlib',
  'daraa',
  'as_suwayda',
  'quneitra',
  'deir_ez_zor',
  'al_hasakah',
  'raqqa',
]);

/** Empty/NaN inputs become undefined so optional numeric fields stay optional. */
const optionalPositiveInt = z.preprocess(
  (value) =>
    value === '' || value === null || (typeof value === 'number' && Number.isNaN(value))
      ? undefined
      : value,
  z.coerce.number().int().positive().optional(),
);

// ---------------------------------------------------------------------------
// Step 1 — owner & type
// ---------------------------------------------------------------------------

export const step1Schema = z.object({
  ownerId: z.string().min(1, 'facility.wizard.errors.owner'),
  kind: kindEnum,
});
export type Step1Values = z.infer<typeof step1Schema>;

// ---------------------------------------------------------------------------
// Step 2 — basics (one schema for both kinds; pitch stores [sport])
// ---------------------------------------------------------------------------

export const step2Schema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'facility.wizard.errors.name')
    .max(60, 'facility.wizard.errors.name'),
  description: z.string().max(500).optional(),
  sports: z.array(sportEnum).min(1, 'facility.wizard.errors.sports'),
  contactPhone: z
    .union([z.string().regex(/^[0-9+\s-]{8,}$/, 'facility.wizard.errors.phone'), z.literal('')])
    .optional(),
});
export type Step2Values = z.infer<typeof step2Schema>;

// ---------------------------------------------------------------------------
// Step 3 — location (flat fields; the wizard merges them into `location`)
// ---------------------------------------------------------------------------

export const step3Schema = z.object({
  governorate: governorateEnum,
  city: z.string().trim().min(2, 'facility.wizard.errors.city'),
  district: z.string().trim().min(2, 'facility.wizard.errors.district'),
  address: z.string().trim().min(5, 'facility.wizard.errors.address'),
  // Driven by the map picker — a NaN default fails the finite check until a point is dropped.
  lat: z
    .number()
    .refine((n) => Number.isFinite(n) && n >= -90 && n <= 90, 'facility.wizard.errors.location'),
  lng: z
    .number()
    .refine((n) => Number.isFinite(n) && n >= -180 && n <= 180, 'facility.wizard.errors.location'),
});
export type Step3Values = z.infer<typeof step3Schema>;

// ---------------------------------------------------------------------------
// Step 4 — details (pitch vs club)
// ---------------------------------------------------------------------------

const specsSchema = z.object({
  surface: surfaceEnum,
  isIndoor: z.boolean(),
  hasLighting: z.boolean(),
  hasParking: z.boolean(),
  hasLockerRoom: z.boolean(),
  hasCafe: z.boolean(),
});

const cancelPolicySchema = z.object({
  freeHoursBefore: z.coerce.number().int().min(0),
  penaltyPercent: z.coerce.number().min(0).max(100),
});

export const step4PitchSchema = z.object({
  pricePerHour: z.coerce.number().positive('facility.wizard.errors.price'),
  capacity: optionalPositiveInt,
  specs: specsSchema,
  cancelPolicy: cancelPolicySchema,
});
export type Step4PitchValues = z.infer<typeof step4PitchSchema>;

const dayHoursSchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});

export const step4ClubSchema = z.object({
  workingHours: z
    .record(z.string(), dayHoursSchema)
    .refine(
      (hours) =>
        Object.values(hours).some(
          (day) => day.isOpen && Boolean(day.openTime) && Boolean(day.closeTime),
        ),
      'facility.wizard.errors.workingHours',
    ),
});
export type Step4ClubValues = z.infer<typeof step4ClubSchema>;

// ---------------------------------------------------------------------------
// Step: courts (club only) — at least one authored court
// ---------------------------------------------------------------------------

export const courtInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'facility.wizard.errors.courtName'),
  sport: sportEnum,
  pricePerHour: z.number().positive('facility.wizard.errors.price'),
  surface: surfaceEnum,
  isIndoor: z.boolean(),
  hasLighting: z.boolean(),
  // The editor already normalises empty → undefined, so no preprocess needed here
  // (keeping input === output so RHF's resolver generics line up).
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean(),
});
export type CourtInputValues = z.infer<typeof courtInputSchema>;

export const stepCourtsSchema = z.object({
  courts: z.array(courtInputSchema).min(1, 'facility.wizard.errors.courts'),
});
export type StepCourtsValues = z.infer<typeof stepCourtsSchema>;

// ---------------------------------------------------------------------------
// Step: media — at least one photo + at least one verification document
// (every facility must be verifiable — mirrors the owner KYC requirement).
// ---------------------------------------------------------------------------

export const step5Schema = z.object({
  images: z
    .array(z.string().url('facility.wizard.errors.images'))
    .min(1, 'facility.wizard.errors.images')
    .max(6, 'facility.wizard.errors.images'),
  documents: z
    .array(
      z.object({
        // A doc-type CATEGORY from the API's closed enum, not a free-text label
        // and not the uploaded filename. Derived from FACILITY_DOC_TYPES so the
        // wizard cannot drift from what the create routes accept.
        name: z.enum(FACILITY_DOC_TYPES),
        url: z.string().url('facility.wizard.errors.document'),
      }),
    )
    .min(1, 'facility.wizard.errors.documents'),
});
export type Step5Values = z.infer<typeof step5Schema>;
