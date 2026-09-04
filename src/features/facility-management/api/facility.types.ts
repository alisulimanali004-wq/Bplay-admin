/**
 * Facility Management — domain types (the master contract for the slice).
 *
 * Ported from the Bplay mobile app's facility model (club/pitch discriminated
 * union, 5-state FacilityStatus, Syrian governorates) per admin SRS 09-facilities.
 * Wire DTOs mirror the mobile snake_case contract so go-live is a flag flip.
 */

import type { BadgeVariant, CoverageTone, DateRangeValue } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { resolveUploadUrl } from '@shared/utils/url';

// ---------------------------------------------------------------------------
// Enums (wire values match the mobile app's apiValue strings)
// ---------------------------------------------------------------------------

export type FacilityStatus = 'pending' | 'active' | 'rejected' | 'suspended' | 'owner_suspended';

export type FacilityKind = 'club' | 'pitch';

export type SyrianGovernorate =
  | 'damascus'
  | 'rif_dimashq'
  | 'aleppo'
  | 'homs'
  | 'hama'
  | 'latakia'
  | 'tartus'
  | 'idlib'
  | 'daraa'
  | 'as_suwayda'
  | 'quneitra'
  | 'deir_ez_zor'
  | 'al_hasakah'
  | 'raqqa';

/**
 * Every sport the platform seeds, as a lowercase slug.
 *
 * This list must cover the `sports` table. It previously held only six of the
 * twelve seeded rows, and `normalizeSport` falls back to 'football' for
 * anything unrecognised — so a Badminton court rendered as Football rather than
 * as "unknown". Silent, confident, and wrong.
 *
 * The DB stores DISPLAY names ('Table Tennis', 'Gym / Fitness'); these slugs are
 * derived from them by `sportSlug`, and the labels come back from i18n.
 */
export type SportType =
  | 'tennis'
  | 'padel'
  | 'football'
  | 'basketball'
  | 'swimming'
  | 'volleyball'
  | 'badminton'
  | 'squash'
  | 'table_tennis'
  | 'cycling'
  | 'running'
  | 'gym_fitness';

export type PitchSurface = 'grass' | 'artificial' | 'hardcourt' | 'clay' | 'sand';

/** The admin actions available on a facility (approve/reject need pending). */
export type FacilityAction = 'approve' | 'reject' | 'suspend' | 'reactivate';

/**
 * How a facility entered the platform: created by an admin from THIS dashboard,
 * or by the owner through the mobile app. Only admin-created facilities may be
 * edited here — see {@link canEditFacility}.
 */
export type FacilitySource = 'admin' | 'owner';

export const FACILITY_SOURCES: FacilitySource[] = ['admin', 'owner'];

/** Editing is allowed only for facilities the admin created from the dashboard. */
export function canEditFacility(source: FacilitySource): boolean {
  return source === 'admin';
}

/** A pending submission waiting longer than this is "aged" (review-desk amber). */
export const AGED_THRESHOLD_HOURS = 48;

/** True when the submission has waited past the aged threshold. */
export function isAged(createdAt: string, thresholdHours: number = AGED_THRESHOLD_HOURS): boolean {
  return Date.now() - new Date(createdAt).getTime() >= thresholdHours * 3_600_000;
}

export const FACILITY_STATUSES: FacilityStatus[] = [
  'pending',
  'active',
  'rejected',
  'suspended',
  'owner_suspended',
];

/** Facility statuses shown on a coverage-map legend, in display order. */
export const FACILITY_LEGEND_STATUSES: FacilityStatus[] = [
  'active',
  'pending',
  'suspended',
  'rejected',
  'owner_suspended',
];

/** Map a facility status to a coverage-map pin tone — the single source of this mapping. */
export function facilityStatusTone(status: FacilityStatus): CoverageTone {
  switch (status) {
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    case 'suspended':
    case 'rejected':
    case 'owner_suspended':
      return 'danger';
    default:
      return 'neutral';
  }
}

export const FACILITY_KINDS: FacilityKind[] = ['club', 'pitch'];

export const SYRIAN_GOVERNORATES: SyrianGovernorate[] = [
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
];

/**
 * Ordered alias table for best-effort matching of a reverse-geocoded state string
 * to a governorate. `rif_dimashq` precedes `damascus` so "ريف دمشق" never matches
 * Damascus first.
 */
const GOVERNORATE_ALIASES: Array<[SyrianGovernorate, string[]]> = [
  ['rif_dimashq', ['rif dimashq', 'rif-dimashq', 'ريف دمشق']],
  ['damascus', ['damascus', 'دمشق']],
  ['aleppo', ['aleppo', 'حلب']],
  ['homs', ['homs', 'حمص']],
  ['hama', ['hama', 'حماة', 'حماه']],
  ['latakia', ['latakia', 'lattakia', 'اللاذقية', 'لاذقية']],
  ['tartus', ['tartus', 'طرطوس']],
  ['idlib', ['idlib', 'إدلب', 'ادلب']],
  ['daraa', ['daraa', "dar'a", 'درعا']],
  ['as_suwayda', ['suwayda', 'sweida', 'as-suwayda', 'السويداء', 'سويداء']],
  ['quneitra', ['quneitra', 'القنيطرة', 'قنيطرة']],
  ['deir_ez_zor', ['deir ez-zor', 'deir ez zor', 'deir', 'دير الزور']],
  ['al_hasakah', ['hasakah', 'hasaka', 'al-hasakah', 'الحسكة', 'حسكة']],
  ['raqqa', ['raqqa', 'ar-raqqah', 'الرقة', 'رقة']],
];

/** Best-effort map of a reverse-geocoded state/governorate string to the enum. */
export function matchGovernorate(raw: string | undefined | null): SyrianGovernorate | undefined {
  if (!raw) return undefined;
  const value = raw.toLowerCase();
  for (const [governorate, aliases] of GOVERNORATE_ALIASES) {
    if (aliases.some((alias) => value.includes(alias))) return governorate;
  }
  return undefined;
}

export const SPORT_TYPES: SportType[] = [
  'tennis',
  'padel',
  'football',
  'basketball',
  'swimming',
  'volleyball',
  'badminton',
  'squash',
  'table_tennis',
  'cycling',
  'running',
  'gym_fitness',
];

/**
 * Turn whatever the API sends for a sport into a slug.
 *
 * The `sports` table stores display names — 'Table Tennis', 'Gym / Fitness' —
 * so a plain lowercase is not enough: the separator has to collapse too. Detail
 * endpoints also send `{ id, name }` objects rather than strings, which is
 * handled by `enumText` before this runs.
 */
export function sportSlug(value: unknown): string {
  return enumText(value)
    .replace(/[\s/]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export const PITCH_SURFACES: PitchSurface[] = ['grass', 'artificial', 'hardcourt', 'clay', 'sand'];

/** Amenities a facility can offer — unified across pitches (specs) and clubs (courts). */
export type FacilityAmenity = 'indoor' | 'lighting' | 'parking' | 'lockerRoom' | 'cafe';

export const FACILITY_AMENITIES: FacilityAmenity[] = [
  'indoor',
  'lighting',
  'parking',
  'lockerRoom',
  'cafe',
];

/** Document-verification state derived from a facility's documents. */
export type FacilityVerification = 'verified' | 'unverified' | 'no_docs';

export const FACILITY_VERIFICATIONS: FacilityVerification[] = ['verified', 'unverified', 'no_docs'];

/** Per-document review status (mirrors the owner KYC review contract). */
export type FacilityDocStatus = 'pending' | 'approved' | 'rejected';

export const FACILITY_DOC_STATUSES: FacilityDocStatus[] = ['pending', 'approved', 'rejected'];

/** Per-document review decisions an admin can apply. */
export type FacilityDocAction = 'accept' | 'reject';

/** Sortable directory columns. */
export type FacilitySortBy = 'createdAt' | 'name' | 'rating';

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

export interface FacilityLocation {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  governorate?: SyrianGovernorate;
  district?: string;
}

export interface FacilityDocument {
  id: string;
  /** Free-text document title (e.g. "Business License") — the row label. */
  name: string;
  status: FacilityDocStatus;
  /** Admin note explaining a rejection (shown to the owner, who may re-upload). */
  rejectionReason?: string;
  url: string;
  /** Drives the viewer branch + row icon — an inline image vs an embedded PDF/file. */
  kind: 'image' | 'pdf';
}

/** Read-only figures (D-ADM-5) — the admin never edits these. */
/**
 * The counters the detail endpoint actually computes.
 *
 * It returns `avgRating`, `reviewCount` and `totalBookings`. The model used to
 * declare `occupancyPercent` / `revenueSyp` / `todayBookings` — three keys the
 * API has never sent — so all three read `undefined`, fell through to their `?? 0`
 * defaults, and the profile's stat row showed a confident 0 / 0 SYP / 0 for every
 * facility while the real figures went unused.
 *
 * The old three are kept as optional so a future endpoint can supply them
 * without another model change, but nothing displays them unless they arrive.
 */
export interface FacilityStatistics {
  avgRating: number;
  reviewCount: number;
  totalBookings: number;
  occupancyPercent?: number;
  revenueSyp?: number;
  todayBookings?: number;
}

/** An in-club court. A pitch-kind facility IS its own single court. */
export interface Court {
  id: string;
  name: string;
  sport: SportType;
  pricePerHour: number;
  surface: PitchSurface;
  isIndoor: boolean;
  hasLighting: boolean;
  capacity?: number;
  isActive: boolean;
}

export interface PitchSpecs {
  surface: PitchSurface;
  isIndoor: boolean;
  hasLighting: boolean;
  hasParking: boolean;
  hasLockerRoom: boolean;
  hasCafe: boolean;
}

export interface CancelPolicy {
  freeHoursBefore: number;
  penaltyPercent: number;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

/** Keyed by ISO weekday (1 = Monday … 7 = Sunday). Missing key = closed. */
export type WorkingHours = Record<number, DayHours>;

// ---------------------------------------------------------------------------
// Facility entities — discriminated union on `kind`
// ---------------------------------------------------------------------------

export interface FacilityBase {
  id: string;
  name: string;
  kind: FacilityKind;
  status: FacilityStatus;
  location: FacilityLocation;
  images: string[];
  ownerId: string;
  ownerName: string;
  /** Owner's avatar photo (for the clickable owner cell); falls back to initials. */
  ownerPhotoUrl?: string;
  createdAt: string;
  /** Origin: 'admin' (created from this dashboard — editable here) or 'owner' (via the app). */
  source: FacilitySource;
  /** Rejection reason — set when status is 'rejected'; shown to the owner. */
  adminNotes?: string;
  /** Admin suspension reason — set when status is 'suspended'. */
  suspensionReason?: string;
  rating?: number;
  /**
   * Free-text blurb. On the BASE, not just on a club: the detail endpoint
   * returns `description` for both kinds, but it used to be declared on
   * `ClubFacility` alone — so a pitch's description was mapped nowhere and the
   * profile page, which also gated the section on `kind === 'club'`, could
   * never show one.
   */
  description?: string;
  /**
   * The rest of what the detail endpoint returns. Every one of these was on the
   * wire and dropped on the floor: the model simply had nowhere to put them, so
   * the profile page could not show them however it was written.
   */
  /** Sub-type of the venue ('complex', 'stadium', …). Free text from the owner. */
  venueType?: string;
  /** Owner's contact number, distinct from the facility's public `contactPhone`. */
  ownerPhone?: string;
  /** Hero image chosen by the owner; `images[0]` is the fallback. */
  coverUrl?: string;
  /** Whatever social profiles the owner registered, keyed by network. */
  socialLinks?: Record<string, string>;
  /** Live/paused independently of the review `status`. */
  isActive?: boolean;
  /** When an admin suspended it — pairs with `suspensionReason`. */
  suspendedAt?: string;
  /** Admin who last reviewed the facility. */
  reviewedBy?: string;
  /** Last modification, for the audit line in the details card. */
  updatedAt?: string;
  documents: FacilityDocument[];
  statistics: FacilityStatistics;
}

export interface ClubFacility extends FacilityBase {
  kind: 'club';
  description?: string;
  logoUrl?: string;
  sports: SportType[];
  workingHours: WorkingHours;
  contactPhone?: string;
  courts: Court[];
}

export interface PitchFacility extends FacilityBase {
  kind: 'pitch';
  sport: SportType;
  pricePerHour: number;
  capacity?: number;
  specs: PitchSpecs;
  cancelPolicy: CancelPolicy;
}

export type Facility = ClubFacility | PitchFacility;

/** Flat projection for the directory table / review-desk cards. */
export interface FacilityListItem {
  id: string;
  name: string;
  kind: FacilityKind;
  status: FacilityStatus;
  sports: SportType[];
  governorate?: SyrianGovernorate;
  city?: string;
  /** Names of the scope regions containing this facility (may be several). */
  regionNames: string[];
  /** True when no active scope region contains the facility (super_admin only). */
  isOrphan: boolean;
  ownerId: string;
  ownerName: string;
  /** Owner's avatar photo (for the clickable owner cell); falls back to initials. */
  ownerPhotoUrl?: string;
  /** Origin: 'admin' (created from the dashboard) or 'owner' (via the app). */
  source: FacilitySource;
  rating?: number;
  thumbnailUrl?: string;
  /** All facility photos — the review queue shows a hero + peeking strip. */
  images: string[];
  createdAt: string;
  documents: FacilityDocument[];
  /** Amenities offered (derived) — powers the amenity filter chips. */
  amenities: FacilityAmenity[];
  /** Document-verification state (derived) — powers the verification filter + badge. */
  verification: FacilityVerification;
}

/**
 * Amenities a facility offers, unified across pitches (from specs) and clubs
 * (from their courts). Club-level parking / locker room / cafe are inferred from
 * the club's scale and mix — a mock-first heuristic a real backend replaces with
 * explicit flags. Returned in the canonical FACILITY_AMENITIES order.
 */
export function facilityAmenities(facility: Facility): FacilityAmenity[] {
  const set = new Set<FacilityAmenity>();
  if (facility.kind === 'pitch') {
    const s = facility.specs;
    if (s.isIndoor) set.add('indoor');
    if (s.hasLighting) set.add('lighting');
    if (s.hasParking) set.add('parking');
    if (s.hasLockerRoom) set.add('lockerRoom');
    if (s.hasCafe) set.add('cafe');
  } else {
    if (facility.courts.some((c) => c.isIndoor)) set.add('indoor');
    if (facility.courts.some((c) => c.hasLighting)) set.add('lighting');
    if (facility.courts.length >= 3) set.add('parking');
    if (facility.courts.some((c) => c.isIndoor)) set.add('lockerRoom');
    if (facility.sports.includes('swimming') || facility.courts.length >= 4) set.add('cafe');
  }
  return FACILITY_AMENITIES.filter((amenity) => set.has(amenity));
}

/** All docs approved = verified; any still pending = unverified; none uploaded = no_docs. */
export function facilityVerification(facility: Facility): FacilityVerification {
  if (facility.documents.length === 0) return 'no_docs';
  return facility.documents.every((doc) => doc.status === 'approved') ? 'verified' : 'unverified';
}

/**
 * A facility may only be approved once every uploaded verification document is
 * approved (a facility with no documents can never be approved). Drives the
 * approve-button gate on the queue, the directory rows and the profile, and is
 * enforced again in the approve mutation.
 */
export function facilityDocsAllApproved(documents: FacilityDocument[]): boolean {
  return documents.length > 0 && documents.every((doc) => doc.status === 'approved');
}

/** Per-document status → Badge variant (mirrors the owner doc-status mapping). */
const FACILITY_DOC_STATUS_KEY: Record<FacilityDocStatus, string> = {
  pending: 'review',
  approved: 'approved',
  rejected: 'rejected',
};
export function facilityDocBadgeVariant(status: FacilityDocStatus): BadgeVariant {
  return statusToBadgeVariant(FACILITY_DOC_STATUS_KEY[status]);
}

/** An image vs a PDF/other file, from the mime type, the url or the filename extension. */
export function facilityDocumentKind(url: string, mime?: string, name?: string): 'image' | 'pdf' {
  if (mime?.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  // Wizard uploads carry a `blob:` URL with no extension, so fall back to the filename.
  const imageExt = /\.(png|jpe?g|webp|gif)$/i;
  return imageExt.test(url) || (name != null && imageExt.test(name)) ? 'image' : 'pdf';
}

export function toFacilityListItem(
  facility: Facility,
  regionNames: string[],
  isOrphan: boolean,
): FacilityListItem {
  return {
    id: facility.id,
    name: facility.name,
    kind: facility.kind,
    status: facility.status,
    sports: facility.kind === 'club' ? facility.sports : [facility.sport],
    governorate: facility.location.governorate,
    city: facility.location.city,
    regionNames,
    isOrphan,
    ownerId: facility.ownerId,
    ownerName: facility.ownerName,
    ownerPhotoUrl: facility.ownerPhotoUrl,
    source: facility.source,
    rating: facility.rating,
    thumbnailUrl: facility.images[0],
    images: facility.images,
    createdAt: facility.createdAt,
    documents: facility.documents,
    amenities: facilityAmenities(facility),
    verification: facilityVerification(facility),
  };
}

/**
 * Flat projection of a facility for the region detail page — the facilities
 * that fall inside a region's geo circle (map pins + table rows).
 */
export interface RegionFacility {
  id: string;
  name: string;
  kind: FacilityKind;
  status: FacilityStatus;
  ownerId: string;
  ownerName: string;
  ownerPhotoUrl?: string;
  rating?: number;
  thumbnailUrl?: string;
  lat: number;
  lng: number;
  /**
   * The neighbourhood this facility is filed under, as the SERVER resolved it
   * (`facilities.neighbourhood_id`). Undefined when it has none — that is a real
   * state, not a gap to paper over, and such a facility must never silently drop
   * out of a filtered view without the filter saying so.
   */
  neighbourhoodName?: string;
  statistics: FacilityStatistics;
}

/** Project a full facility to the flat RegionFacility shape (sport ignored). */
export function toRegionFacility(facility: Facility): RegionFacility {
  return {
    id: facility.id,
    name: facility.name,
    kind: facility.kind,
    status: facility.status,
    ownerId: facility.ownerId,
    ownerName: facility.ownerName,
    ownerPhotoUrl: facility.ownerPhotoUrl,
    rating: facility.rating,
    thumbnailUrl: facility.images[0],
    lat: facility.location.lat,
    lng: facility.location.lng,
    neighbourhoodName: facility.location.district || undefined,
    statistics: facility.statistics,
  };
}

/**
 * The minimal region context passed to the Add-Facility wizard when it is
 * opened from a region's detail page. The wizard seeds the new facility's
 * coordinates from the region center (so it falls inside the region circle)
 * and skips the standalone location step. Carried in router navigation state.
 */
export interface FacilityRegionSeed {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

/** Pick the wizard-relevant fields off a region (drops extra region fields). */
export function facilityRegionSeed(region: FacilityRegionSeed): FacilityRegionSeed {
  return {
    id: region.id,
    name: region.name,
    centerLat: region.centerLat,
    centerLng: region.centerLng,
    radiusKm: region.radiusKm,
  };
}

// ---------------------------------------------------------------------------
// List query params / result
// ---------------------------------------------------------------------------

export interface FacilityListParams {
  /** Matches facility name or owner name. */
  q?: string;
  status?: 'all' | FacilityStatus;
  kind?: 'all' | FacilityKind;
  /** Origin: created by an admin from the dashboard vs by the owner via the app. */
  source?: 'all' | FacilitySource;
  sport?: 'all' | SportType;
  /** A scope-region id, 'orphans' (super_admin only) or 'all'. */
  regionId?: 'all' | 'orphans' | string;
  ownerId?: 'all' | string;
  /** Minimum rating (inclusive); undefined = any. */
  minRating?: number;
  governorate?: 'all' | SyrianGovernorate;
  /** Free-text city match (case-insensitive substring); empty = any. */
  city?: string;
  verification?: 'all' | FacilityVerification;
  /** Every listed amenity must be present (AND semantics). */
  amenities?: FacilityAmenity[];
  /** Created-date window; preset 'all' = no date filter. */
  dateRange?: DateRangeValue;
  sortBy?: FacilitySortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** Scope-aware KPI figures for the directory header (one lightweight call). */
export interface FacilityStats {
  total: number;
  active: number;
  pending: number;
  /** Admin-suspended + owner-paused combined. */
  suspended: number;
  rejected: number;
  /** Mean rating across rated facilities (0 when none rated). */
  avgRating: number;
  /** Pending submissions past the aged threshold — the "needs attention" figure. */
  aged: number;
  /** Facilities outside every active region (super_admin scope only). */
  orphan: number;
}

export interface FacilityListResult {
  items: FacilityListItem[];
  total: number;
  page: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** A court being authored in the wizard — id is assigned on save (absent = new). */
export interface CourtInput {
  id?: string;
  name: string;
  sport: SportType;
  pricePerHour: number;
  surface: PitchSurface;
  isIndoor: boolean;
  hasLighting: boolean;
  capacity?: number;
  isActive: boolean;
}

/**
 * The verification-document CATEGORY the API accepts — a closed set, not a label.
 *
 * `documents[].name` is declared as an enum of exactly these five values on both
 * create routes. It is a doc TYPE, matching `owner.doc.type.*` and what the
 * profile card already renders, NOT a human-readable title.
 *
 * The wizard used to send the uploaded FILE'S NAME here ('business-license.pdf'),
 * which is not a member of the enum, so every real upload failed validation with
 * "Request validation failed" and no facility could be created at all. Only a
 * file literally named `business_license` would have passed.
 */
export const FACILITY_DOC_TYPES = [
  'national_id',
  'business_license',
  'tax_certificate',
  'ownership_proof',
  'other',
] as const;

export type FacilityDocType = (typeof FACILITY_DOC_TYPES)[number];

/** Anything outside the enum is filed as `other` rather than rejected on send. */
export function toFacilityDocType(value: string | undefined): FacilityDocType {
  return FACILITY_DOC_TYPES.includes(value as FacilityDocType)
    ? (value as FacilityDocType)
    : 'other';
}

/** An uploaded verification document (category + resolvable URL). */
export interface FacilityDocumentInput {
  name: FacilityDocType;
  url: string;
}

/** Wizard payload — kind-specific fields validated per step by facility.schema. */
export interface CreateFacilityInput {
  ownerId: string;
  kind: FacilityKind;
  name: string;
  description?: string;
  /** Club: one or more sports. Pitch: exactly one (first entry). */
  sports: SportType[];
  contactPhone?: string;
  location: FacilityLocation;
  /** Club only. */
  workingHours?: WorkingHours;
  /** Club only — the authored courts. */
  courts?: CourtInput[];
  /** Pitch only. */
  pricePerHour?: number;
  capacity?: number;
  specs?: PitchSpecs;
  cancelPolicy?: CancelPolicy;
  images: string[];
  /** Verification documents. */
  documents?: FacilityDocumentInput[];
}

/** Editing reuses the create shape; the id is passed alongside. */
export type UpdateFacilityInput = CreateFacilityInput;

/** Seed the wizard draft from an existing facility (edit mode). */
export function facilityToInput(facility: Facility): CreateFacilityInput {
  const base: CreateFacilityInput = {
    ownerId: facility.ownerId,
    kind: facility.kind,
    name: facility.name,
    sports: facility.kind === 'club' ? [...facility.sports] : [facility.sport],
    contactPhone: facility.kind === 'club' ? facility.contactPhone : undefined,
    location: { ...facility.location },
    images: [...facility.images],
    // Coerced, not passed through: a stored document may predate the enum (or
    // carry a filename written by the old wizard), and re-submitting that value
    // verbatim would fail validation on save in edit mode.
    documents: facility.documents.map((doc) => ({
      name: toFacilityDocType(doc.name),
      url: doc.url,
    })),
  };
  if (facility.kind === 'club') {
    return {
      ...base,
      description: facility.description,
      workingHours: { ...facility.workingHours },
      courts: facility.courts.map((court) => ({
        id: court.id,
        name: court.name,
        sport: court.sport,
        pricePerHour: court.pricePerHour,
        surface: court.surface,
        isIndoor: court.isIndoor,
        hasLighting: court.hasLighting,
        capacity: court.capacity,
        isActive: court.isActive,
      })),
    };
  }
  return {
    ...base,
    pricePerHour: facility.pricePerHour,
    capacity: facility.capacity,
    specs: { ...facility.specs },
    cancelPolicy: { ...facility.cancelPolicy },
  };
}

/** The two review actions applicable in bulk from the queue. */
export type BulkFacilityAction = 'approve' | 'reject';

/** Why the backend declined to act on one facility in a bulk request. */
export type BulkSkipReason =
  | 'ERR_FACILITY_NOT_FOUND'
  | 'ERR_ALREADY_IN_STATUS'
  | 'ERR_NOT_PENDING_REVIEW'
  | 'ERR_NO_DOCUMENTS'
  | 'ERR_DOCUMENTS_NOT_APPROVED';

export interface BulkSkip {
  id: string;
  reason: BulkSkipReason;
  /** The status that blocked it, when the skip was a state problem. */
  status?: string;
}

export interface BulkActionResult {
  /** How many facilities the action actually applied to (invalid transitions skipped). */
  succeeded: number;
  /**
   * Facilities the backend declined to act on, each with a reason. A bare id
   * list could not distinguish "outside your region" from "KYC docs not
   * approved" from "already decided", so the UI had nothing useful to report.
   */
  skipped: BulkSkip[];
}

// ---------------------------------------------------------------------------
// Wire DTO (snake_case, mirrors the mobile/backend contract) + normalizer
// ---------------------------------------------------------------------------

export interface FacilityDto {
  id?: string | number;
  name?: string;
  /**
   * club | pitch. The detail and list endpoints send `kind`; the CREATE response
   * calls the same thing `type`, which is why a freshly created club mapped to
   * a pitch until `createFacility` reconciled them.
   */
  kind?: string;
  type?: string;
  /** Detail-endpoint extras that the model now carries through to the page. */
  ownerPhone?: string;
  owner_phone?: string;
  coverUrl?: string;
  cover_url?: string;
  socialLinks?: Record<string, string> | null;
  social_links?: Record<string, string> | null;
  isActive?: boolean;
  is_active?: boolean;
  suspendedAt?: string | null;
  suspended_at?: string | null;
  reviewedBy?: string | null;
  reviewed_by?: string | null;
  updatedAt?: string;
  updated_at?: string;
  /** DETAIL endpoint. The LIST endpoint sends `approval_status` instead. */
  status?: string;
  /**
   * LIST endpoint's name for the same field.
   *
   * Reading only `status` meant every row in a list arrived undefined and
   * `normalizeStatus` fell through to its 'pending' default — so the KPI row
   * reported 8 pending / 0 active over a set that is really 1 pending and 7
   * approved, and the directory could not filter by status at all.
   */
  approval_status?: string;
  /** Suspension is orthogonal to the review outcome and overrides it. */
  is_suspended?: boolean;
  location?: {
    lat?: number;
    lng?: number;
    /** The admin DETAIL endpoint spells them out inside `location`. */
    latitude?: number | string | null;
    longitude?: number | string | null;
    address?: string;
    city?: string;
    governorate?: string;
    district?: string;
    neighbourhood?: string;
  };
  /** LIST endpoint: coordinates and place names arrive flat, not under `location`. */
  latitude?: number | string | null;
  longitude?: number | string | null;
  city_name?: string | null;
  cityName?: string | null;
  neighborhood_name?: string | null;
  neighbourhoodName?: string | null;
  images?: string[];
  /** The admin detail endpoint's name for the gallery. */
  // `photoUrl` is what the admin detail endpoint actually sends; declaring only
  // `url` is why the empty-gallery bug type-checked cleanly.
  photos?: Array<
    | string
    | {
        url?: string;
        photoUrl?: string;
        photo_url?: string;
        isCover?: boolean;
        sortOrder?: number;
        sort_order?: number;
      }
    | null
  >;
  owner_id?: string | number;
  ownerId?: string | number;
  owner_name?: string;
  ownerName?: string;
  source?: string;
  created_at?: string;
  createdAt?: string;
  admin_notes?: string;
  adminNotes?: string;
  suspension_reason?: string;
  suspensionReason?: string;
  isSuspended?: boolean;
  rating?: number;
  documents?: Array<{
    id?: string | number;
    name?: string;
    status?: string;
    rejection_reason?: string;
    rejectReason?: string;
    url?: string;
    mime_type?: string;
    /** What the admin detail endpoint actually sends. */
    fileUrl?: string;
    file_url?: string;
    docType?: string;
    doc_type?: string;
    mimeType?: string;
  }>;
  statistics?: {
    /** What the detail endpoint returns. */
    avgRating?: number | string;
    avg_rating?: number | string;
    reviewCount?: number | string;
    review_count?: number | string;
    totalBookings?: number | string;
    total_bookings?: number | string;
    occupancyPercent?: number;
    occupancy_percent?: number;
    revenueSyp?: number;
    revenue_syp?: number;
    todayBookings?: number;
    today_bookings?: number;
  };
  // Club
  description?: string;
  logo_url?: string;
  logoUrl?: string;
  /**
   * The LIST endpoint sends plain slugs; the admin DETAIL endpoint sends
   * `{ id, name }` objects. `normalizeSport` accepts both — see `enumText`.
   */
  sports?: Array<string | { id?: string; name?: string; slug?: string }>;
  working_hours?: Record<
    string,
    { is_open?: boolean; open_time?: string; close_time?: string }
  >;
  /** The admin detail endpoint sends an ARRAY keyed by `dayOfWeek` instead. */
  workingHours?: Array<{
    dayOfWeek?: number;
    day_of_week?: number;
    openTime?: string | null;
    open_time?: string | null;
    closeTime?: string | null;
    close_time?: string | null;
    isClosed?: boolean;
    is_closed?: boolean;
  }>;
  contact_phone?: string;
  contactPhone?: string;
  courts?: Array<{
    id?: string | number;
    name?: string;
    sport?: string | { id?: string; name?: string; slug?: string };
    /** Detail endpoint's spelling of the sport. */
    sportName?: string;
    price_per_hour?: number;
    pricePerHour?: number | string;
    surface?: string;
    surfaceType?: string | null;
    is_indoor?: boolean;
    /** Detail endpoint expresses indoor/outdoor as an enum instead of a flag. */
    environment?: string | null;
    has_lighting?: boolean;
    hasLighting?: boolean;
    capacity?: number;
    is_active?: boolean;
    isActive?: boolean;
  }>;
  // Pitch
  sport?: string;
  price_per_hour?: number;
  capacity?: number;
  specs?: {
    surface?: string;
    is_indoor?: boolean;
    has_lighting?: boolean;
    has_parking?: boolean;
    has_locker_room?: boolean;
    has_cafe?: boolean;
  };
  cancel_policy?: { free_hours_before?: number; penalty_percent?: number };
}

/**
 * First finite number among the candidates, else NaN.
 *
 * NaN is deliberate: it marks "no coordinate" in a way that fails every
 * comparison, so an unplaced facility can never be mistaken for one sitting at
 * 0,0. Postgres may hand back a numeric as a string, so strings are coerced.
 */
function numOr(...values: Array<number | string | null | undefined>): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}

/**
 * The backend's review outcome vs the dashboard's status vocabulary.
 *
 * `approval_status` is approved | pending | rejected, and the dashboard calls
 * an approved facility 'active'. Without this mapping 'approved' was not in
 * FACILITY_STATUSES, so it fell through to the 'pending' default and every
 * approved facility read as pending — the KPI row showed 8 pending / 0 active
 * over a set that is really 1 pending and 7 approved.
 *
 * Suspension is NOT part of this enum on the wire: it is a separate boolean
 * (`is_suspended` on the facility, plus the owner's own suspension), which is
 * why the caller layers it on top rather than expecting it here.
 */
const STATUS_FROM_WIRE: Record<string, FacilityStatus> = {
  approved: 'active',
  active: 'active',
  pending: 'pending',
  rejected: 'rejected',
  suspended: 'suspended',
  owner_suspended: 'owner_suspended',
};

function normalizeStatus(value: unknown): FacilityStatus {
  const s = enumText(value);
  return STATUS_FROM_WIRE[s] ?? 'pending';
}

function normalizeKind(value: string | undefined): FacilityKind {
  return value === 'club' ? 'club' : 'pitch';
}

function normalizeSource(value: string | undefined): FacilitySource {
  return value === 'admin' ? 'admin' : 'owner';
}

function normalizeGovernorate(value: unknown): SyrianGovernorate | undefined {
  const s = enumText(value);
  return (SYRIAN_GOVERNORATES as string[]).includes(s) ? (s as SyrianGovernorate) : undefined;
}

/**
 * Coerce a DTO enum-ish field to a lowercase string.
 *
 * The detail endpoint returns `sports` as `{ id, name }` OBJECTS while the list
 * endpoint returns plain strings. Calling `.toLowerCase()` on the object form
 * threw `TypeError: (value ?? "").toLowerCase is not a function` — a render-time
 * crash that the app error boundary caught and displayed as "Something went
 * wrong. Please refresh the page." on every club facility profile.
 *
 * Accepting both shapes here fixes it once for every normalizer below, rather
 * than at each of the five call sites.
 */
function enumText(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase();
  if (value && typeof value === 'object') {
    const named = value as { name?: unknown; slug?: unknown };
    const text = named.slug ?? named.name;
    if (typeof text === 'string') return text.toLowerCase();
  }
  return '';
}

/**
 * Map an API sport onto a known slug.
 *
 * Slugified first, so the display names the `sports` table stores ('Table
 * Tennis') resolve rather than falling through. The fallback stays 'football'
 * only because `SportType` has no "unknown" member and every caller expects a
 * concrete value — but with all twelve seeded sports now listed, real data no
 * longer reaches it. See `sportSlug`.
 */
function normalizeSport(value: unknown): SportType {
  const s = sportSlug(value);
  return (SPORT_TYPES as string[]).includes(s) ? (s as SportType) : 'football';
}

function normalizeSurface(value: unknown): PitchSurface {
  const s = enumText(value);
  return (PITCH_SURFACES as string[]).includes(s) ? (s as PitchSurface) : 'artificial';
}

function normalizeDocStatus(value: string | undefined): FacilityDocStatus {
  const s = enumText(value);
  if (s === 'approved' || s === 'accepted' || s === 'verified') return 'approved';
  if (s === 'rejected' || s === 'denied') return 'rejected';
  return 'pending';
}

export function toFacility(dto: FacilityDto): Facility {
  const base: FacilityBase = {
    id: String(dto.id ?? ''),
    name: dto.name ?? '',
    // `kind` first, `type` only as a fallback. They are DIFFERENT fields on the
    // detail endpoint: `kind` is club|pitch, while `type` is the venue sub-type
    // ('complex', 'gym', 'court'). Reading `type` alone made
    // `normalizeKind('complex')` fall through to its 'pitch' default, so every
    // club whose sub-type was set rendered as a pitch — no courts tab, no
    // working hours, no sports.
    //
    // The CREATE response is the one place `type` really does carry club|pitch,
    // which is why it stays as the fallback.
    kind: normalizeKind(dto.kind ?? dto.type),
    // Suspension overrides the review outcome: a suspended facility is still
    // 'approved' on the wire, but the dashboard shows one state per row and
    // "suspended" is the one that matters operationally.
    status: (dto.is_suspended ?? dto.isSuspended)
      ? 'suspended'
      : normalizeStatus(dto.status ?? dto.approval_status),
    // The detail endpoint nests coordinates under `location`; the LIST endpoint
    // returns them flat as `latitude`/`longitude`. Reading only the nested form
    // meant no facility in a list ever had coordinates.
    //
    // `NaN` rather than 0 when they are genuinely absent: 0,0 is a real place
    // (the Atlantic off West Africa), so defaulting to it silently asserts a
    // location instead of admitting there isn't one. Every distance test
    // against NaN is false, so such a facility reads as unplaced — which is
    // the truth — rather than as a confident orphan.
    location: {
      // The detail endpoint spells these `latitude`/`longitude` INSIDE
      // `location`, not `lat`/`lng`, so both are read at each level.
      lat: numOr(dto.location?.lat, dto.location?.latitude, dto.latitude),
      lng: numOr(dto.location?.lng, dto.location?.longitude, dto.longitude),
      address: dto.location?.address ?? '',
      city: dto.location?.city ?? dto.city_name ?? dto.cityName ?? undefined,
      governorate: normalizeGovernorate(dto.location?.governorate),
      district:
        dto.location?.district ??
        dto.location?.neighbourhood ??
        dto.neighborhood_name ??
        dto.neighbourhoodName ??
        undefined,
    },
    // The admin detail endpoint calls the gallery `photos`; the list endpoint
    // and the owner-facing one call it `images`.
    //
    // Each photo object is `{ photoUrl, isCover, sortOrder }` — `photoUrl`, NOT
    // `url`. Only `url` was read, so every entry mapped to '' and was then
    // dropped by the .filter(Boolean): the gallery came back EMPTY for every
    // admin-created facility, which is why a facility filled in completely
    // showed nothing on its profile. Ordered by `sortOrder` so the cover (0)
    // stays first, which is what `images[0]` is used as.
    images: Array.isArray(dto.images)
      ? // The `photos` branch below already repairs its URLs; this one did not,
        // so the LIST endpoint's galleries stayed unresolved while the DETAIL
        // endpoint's were fixed — the same facility rendered differently in the
        // table and on its profile. Both branches now go through the same gate.
        dto.images.map((image) => resolveUploadUrl(image) ?? '').filter(Boolean)
      : Array.isArray(dto.photos)
        ? [...dto.photos]
            .sort((a, b) => {
              const ao = typeof a === 'string' ? 0 : (a?.sortOrder ?? a?.sort_order ?? 0);
              const bo = typeof b === 'string' ? 0 : (b?.sortOrder ?? b?.sort_order ?? 0);
              return ao - bo;
            })
            // Passed through `resolveUploadUrl` for the same reason the
            // documents are: it repairs a scheme-less upload path and drops
            // anything that is not safely http(s), so a bad row yields no image
            // rather than a broken one.
            .map((photo) =>
              resolveUploadUrl(
                typeof photo === 'string'
                  ? photo
                  : (photo?.photoUrl ?? photo?.photo_url ?? photo?.url),
              ) ?? '',
            )
            .filter(Boolean)
        : [],
    // Every field below arrives camelCased from the admin endpoints. Reading
    // only snake_case left the owner link dead and stamped `createdAt` with
    // "now" on each render.
    ownerId: String(dto.owner_id ?? dto.ownerId ?? ''),
    ownerName: dto.owner_name ?? dto.ownerName ?? '',
    source: normalizeSource(dto.source),
    createdAt: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
    adminNotes: dto.admin_notes ?? dto.adminNotes,
    suspensionReason: dto.suspension_reason ?? dto.suspensionReason,
    rating: dto.rating,
    // Mapped on the base so a PITCH keeps its description too — the club branch
    // below re-states it only because `ClubFacility` narrows the field.
    description: dto.description ?? undefined,
    // The remaining detail-endpoint fields. Carried unconditionally so the
    // profile page can show the whole record rather than the subset the model
    // happened to declare.
    // Only a genuine sub-type. On the create response `type` holds club|pitch,
    // which is the KIND, not a sub-type — showing "club" in a "Venue type" row
    // would be noise, so the two kind words are excluded here.
    venueType:
      dto.type && dto.type !== 'club' && dto.type !== 'pitch' ? dto.type : undefined,
    ownerPhone: dto.ownerPhone ?? dto.owner_phone ?? undefined,
    coverUrl: dto.coverUrl ?? dto.cover_url ?? undefined,
    // `{}` is what the endpoint sends when nothing is registered; normalised to
    // undefined so the page can test truthiness rather than key count.
    socialLinks:
      dto.socialLinks && Object.keys(dto.socialLinks).length > 0
        ? dto.socialLinks
        : dto.social_links && Object.keys(dto.social_links).length > 0
          ? dto.social_links
          : undefined,
    isActive: dto.isActive ?? dto.is_active ?? undefined,
    suspendedAt: dto.suspendedAt ?? dto.suspended_at ?? undefined,
    reviewedBy: dto.reviewedBy ?? dto.reviewed_by ?? undefined,
    updatedAt: dto.updatedAt ?? dto.updated_at ?? undefined,
    // The admin detail endpoint names these `fileUrl` and `docType`; only the
    // snake_case aliases were read, so `url` was always '' and `name` always the
    // literal "Document". The card renders its view button as
    // `{document.url && ...}`, so an empty url meant NO WAY TO OPEN A DOCUMENT
    // at all — the row rendered, unclickable.
    //
    // `docType` is a slug ('national_id'); the card translates it through
    // `facility.doc.type.*`, so it is carried as the name and labelled there.
    documents: Array.isArray(dto.documents)
      ? dto.documents.map((doc, index) => {
          // Both halves matter, and the merge that brought `resolveUploadUrl`
          // in kept only its half:
          //   * the ALIASES — the admin detail endpoint sends `fileUrl` and
          //     `docType`, so reading `doc.url`/`doc.name` alone leaves the url
          //     empty (no way to open the document) and the name the literal
          //     "Document";
          //   * `resolveUploadUrl` — repairs a scheme-less upload path and
          //     rejects anything that is not safely http(s).
          const url = resolveUploadUrl(doc.url ?? doc.fileUrl ?? doc.file_url) ?? '';
          const name = doc.name ?? doc.docType ?? doc.doc_type ?? 'Document';
          return {
            id: String(doc.id ?? index),
            name,
            status: normalizeDocStatus(doc.status),
            rejectionReason: doc.rejection_reason ?? doc.rejectReason,
            url,
            kind: facilityDocumentKind(url, doc.mime_type ?? doc.mimeType, name),
          };
        })
      : [],
    // Read the keys the endpoint actually sends. The snake_case reads are kept
    // second so an older payload still maps; see FacilityStatistics for why the
    // original three were always zero.
    statistics: {
      avgRating: Number(dto.statistics?.avgRating ?? dto.statistics?.avg_rating ?? 0),
      reviewCount: Number(dto.statistics?.reviewCount ?? dto.statistics?.review_count ?? 0),
      totalBookings: Number(dto.statistics?.totalBookings ?? dto.statistics?.total_bookings ?? 0),
      occupancyPercent: dto.statistics?.occupancyPercent ?? dto.statistics?.occupancy_percent,
      revenueSyp: dto.statistics?.revenueSyp ?? dto.statistics?.revenue_syp,
      todayBookings: dto.statistics?.todayBookings ?? dto.statistics?.today_bookings,
    },
  };

  if (base.kind === 'club') {
    // Working hours arrive in TWO shapes. The admin detail endpoint sends an
    // ARRAY of `{ dayOfWeek, openTime, closeTime, isClosed }`; older/mock
    // payloads send an OBJECT keyed by weekday. Reading only the object form
    // left every club showing no opening hours at all.
    //
    // Note the polarity flip: the array form carries `isClosed`, the internal
    // model carries `isOpen`.
    const workingHours: WorkingHours = {};
    const rawHours = dto.working_hours ?? dto.workingHours;
    if (Array.isArray(rawHours)) {
      for (const entry of rawHours) {
        const raw = Number(entry?.dayOfWeek ?? entry?.day_of_week);
        if (!Number.isInteger(raw)) continue;
        // Sun=0 on the wire (Postgres EXTRACT(DOW)) -> Sun=7 in the UI, which
        // keys its week Mon=1..Sun=7. Without this the Sunday row would land on
        // a `0` bucket that no day renders, so saved Sunday hours would silently
        // disappear from the profile and come back empty in the edit wizard.
        const weekday = raw === 0 ? 7 : raw;
        const closed = entry?.isClosed ?? entry?.is_closed ?? false;
        // A closed day carries null times; the model wants them absent.
        workingHours[weekday] = {
          isOpen: !closed,
          openTime: entry?.openTime ?? entry?.open_time ?? undefined,
          closeTime: entry?.closeTime ?? entry?.close_time ?? undefined,
        };
      }
    } else {
      for (const [day, hours] of Object.entries(rawHours ?? {})) {
        const weekday = Number(day);
        if (Number.isInteger(weekday)) {
          workingHours[weekday] = {
            isOpen: hours.is_open ?? false,
            openTime: hours.open_time,
            closeTime: hours.close_time,
          };
        }
      }
    }
    const club: ClubFacility = {
      ...base,
      kind: 'club',
      description: dto.description,
      logoUrl: dto.logo_url ?? dto.logoUrl,
      sports: (dto.sports ?? []).map(normalizeSport),
      workingHours,
      contactPhone: dto.contact_phone ?? dto.contactPhone,
      // Courts come back camelCased from the admin endpoint. Each snake_case
      // read is kept first so any older payload still maps.
      courts: (dto.courts ?? []).map((court, index) => ({
        id: String(court.id ?? index),
        name: court.name ?? '',
        // `sport` is absent here — the endpoint names it `sportName`, and as an
        // object under the facility's own `sports`.
        sport: normalizeSport(court.sport ?? court.sportName),
        pricePerHour: Number(court.price_per_hour ?? court.pricePerHour ?? 0),
        surface: normalizeSurface(court.surface ?? court.surfaceType),
        isIndoor: court.is_indoor ?? court.environment === 'indoor',
        hasLighting: court.has_lighting ?? court.hasLighting ?? false,
        capacity: court.capacity,
        isActive: court.is_active ?? court.isActive ?? true,
      })),
    };
    return club;
  }

  const pitch: PitchFacility = {
    ...base,
    kind: 'pitch',
    sport: normalizeSport(dto.sport),
    pricePerHour: dto.price_per_hour ?? 0,
    capacity: dto.capacity,
    specs: {
      surface: normalizeSurface(dto.specs?.surface),
      isIndoor: dto.specs?.is_indoor ?? false,
      hasLighting: dto.specs?.has_lighting ?? false,
      hasParking: dto.specs?.has_parking ?? false,
      hasLockerRoom: dto.specs?.has_locker_room ?? false,
      hasCafe: dto.specs?.has_cafe ?? false,
    },
    cancelPolicy: {
      freeHoursBefore: dto.cancel_policy?.free_hours_before ?? 24,
      penaltyPercent: dto.cancel_policy?.penalty_percent ?? 0,
    },
  };
  return pitch;
}
