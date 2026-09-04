import { z } from 'zod';

/**
 * Region form = a geographic circle (SRS RG1): a name + a map center (lat/lng)
 * + a radius in km. The form writes numbers via setValue (not text inputs), so
 * every geo field is a z.number(). An unpicked center reads as (0,0) — a refine
 * rejects it so the user is forced to place the pin on the map.
 */
export const regionFormSchema = z
  .object({
    name: z.string().trim().min(2, 'region.errors.nameRequired'),
    centerLat: z.number().min(-90).max(90),
    centerLng: z.number().min(-180).max(180),
    radiusKm: z
      .number()
      .positive('region.errors.radiusRequired')
      .max(100, 'region.errors.radiusRange'),
  })
  .refine((data) => data.centerLat !== 0 || data.centerLng !== 0, {
    path: ['centerLat'],
    message: 'region.errors.centerRequired',
  });
export type RegionFormValues = z.infer<typeof regionFormSchema>;

/** Many-to-many admin assignment — an empty array is valid (unassign all). */
export const assignAdminsSchema = z.object({
  adminIds: z.array(z.string()),
});
export type AssignAdminsValues = z.infer<typeof assignAdminsSchema>;

/**
 * Neighbourhood form — the same circle shape as a region, but smaller and with
 * a hard constraint the region form does not have: the circle must fall ENTIRELY
 * inside its parent city, because the backend derives the parent from the
 * geometry (`ST_Contains`) and rejects anything that does not fit.
 *
 * That containment cannot be checked here without the city's polygon, so it is
 * validated client-side against the city's CIRCLE as a close approximation and
 * the server remains the authority.
 */
export const neighbourhoodFormSchema = z
  .object({
    name: z.string().trim().min(2, 'region.errors.nameRequired'),
    centerLat: z.number().min(-90).max(90),
    centerLng: z.number().min(-180).max(180),
    radiusKm: z
      .number()
      .positive('region.errors.radiusRequired')
      .max(50, 'region.errors.radiusRange'),
  })
  .refine((data) => data.centerLat !== 0 || data.centerLng !== 0, {
    path: ['centerLat'],
    message: 'region.errors.centerRequired',
  });
export type NeighbourhoodFormValues = z.infer<typeof neighbourhoodFormSchema>;
