/**
 * Owner Management — domain types.
 *
 * The wire shape is bplay-backend's `/admin/owners-management/owners`, whose
 * vocabulary differs from the dashboard's on three points. `toOwner` is the one
 * place that translation happens:
 *
 *   1. The backend keeps THREE orthogonal signals, not one status:
 *        facility_owners.approval_status  pending | approved | rejected | owner_suspended
 *        users.is_suspended               a reversible pause
 *        users.is_active = false          a permanent ban
 *      The dashboard shows one state, resolved by precedence:
 *        blocked > suspended > review outcome.
 *   2. Documents are pending|approved|rejected on the wire and
 *      under_review|accepted|rejected in the UI.
 *   3. Trust is a TIER enum (basic|verified|premium) — there is no 0-100 score.
 */

import type { BadgeVariant } from '@ui';
import { statusToBadgeVariant } from '@shared/utils/status';
import { resolveUploadUrl } from '@shared/utils/url';

/** Runtime account lifecycle. `rejected` is the admin's review-denied outcome. */
export type OwnerAccountStatus = 'under_review' | 'active' | 'rejected' | 'suspended';

/** The single-glance state shown as the primary badge (account status + ban). */
export type OwnerState = OwnerAccountStatus | 'blocked';

/** Verification document category (wire `doc_type`). */
export type OwnerDocType =
  | 'national_id'
  | 'business_license'
  | 'tax_certificate'
  | 'ownership_proof'
  | 'other';

/** Per-document review status, in the dashboard's vocabulary. */
export type OwnerDocStatus = 'under_review' | 'accepted' | 'rejected';

/** The facility type the owner intends to open (picked at signup). */
export type OwnerFacilityIntent = 'sports_club' | 'independent_court';

/** Account-level status actions a super-admin can apply to an owner. */
export type OwnerAction = 'approve' | 'reject' | 'suspend' | 'activate' | 'block' | 'unblock';

/** Per-document review decisions (translated to approved/rejected on the wire). */
export type OwnerDocAction = 'accept' | 'reject';

export interface OwnerDocument {
  id: string;
  type: OwnerDocType;
  status: OwnerDocStatus;
  /** Admin note explaining a rejection (shown to the owner, who may re-upload). */
  rejectionReason?: string;
  url: string;
  /** Drives the viewer branch — an inline image vs an embedded PDF/file. */
  kind: 'image' | 'pdf';
  uploadedAt?: string;
}

/** Reputation tier, as stored in the database's `trust_tier` enum. */
export type OwnerTrustTier = 'basic' | 'verified' | 'premium';

export interface Owner {
  id: string;
  /** Owner-editable display name (falls back to the legal name). */
  name: string;
  /** Legal identity name (KYC, read-only). */
  legalName?: string;
  email: string;
  phone: string;
  nationalId?: string;
  dateOfBirth?: string;
  photoUrl?: string;
  city?: string;
  address?: string;
  bio?: string;
  /** Optional business website / link the owner added to their profile. */
  link?: string;
  intendedFacilityType?: OwnerFacilityIntent;
  /** Denormalised region label (the owner's city on the wire). */
  region: string;
  accountStatus: OwnerAccountStatus;
  /** Reason for the current rejected / suspended account state (admin note). */
  statusReason?: string;
  /** Permanent ban (super-admin) — orthogonal to accountStatus. */
  isBlocked: boolean;
  /** Reason for the ban — kept separate from statusReason so neither clobbers the other. */
  blockedReason?: string;
  /** Reputation tier (admin-controlled, read-only here). */
  trustTier: OwnerTrustTier;
  /** Whether the owner confirmed their email address. */
  isVerified?: boolean;
  /** Summed monthly revenue across the owner's facilities (FIN, read-only). */
  monthlyRevenueSyp?: number;
  /** Number of facilities this owner owns (hydrated for the list). */
  facilitiesCount?: number;
  documents: OwnerDocument[];
  /**
   * Whether `documents` reflects the server or is merely absent: the list
   * endpoint returns no documents at all, so an empty array there means
   * "unknown", not "none". The approve gate must not read one as the other.
   */
  documentsLoaded: boolean;
  /** Join date. */
  createdAt?: string;
}

/** The single account state shown as the primary state badge. */
export function ownerState(owner: Owner): OwnerState {
  return owner.isBlocked ? 'blocked' : owner.accountStatus;
}

/** Map an owner state to a shared status token for the Badge variant. */
const STATE_STATUS_KEY: Record<OwnerState, string> = {
  under_review: 'review',
  active: 'active',
  rejected: 'rejected',
  suspended: 'suspended',
  blocked: 'blocked',
};
export function ownerStateBadgeVariant(state: OwnerState): BadgeVariant {
  return statusToBadgeVariant(STATE_STATUS_KEY[state]);
}

/** Per-document status → Badge variant. */
const DOC_STATUS_KEY: Record<OwnerDocStatus, string> = {
  under_review: 'review',
  accepted: 'approved',
  rejected: 'rejected',
};
export function ownerDocBadgeVariant(status: OwnerDocStatus): BadgeVariant {
  return statusToBadgeVariant(DOC_STATUS_KEY[status]);
}

export const OWNER_TRUST_VARIANT: Record<OwnerTrustTier, BadgeVariant> = {
  basic: 'neutral',
  verified: 'info',
  premium: 'success',
};

/**
 * Platform-wide owner counts for the list KPI row. The backend computes these
 * as mutually exclusive buckets, so
 * blocked + suspended + underReview + rejected + active === total.
 */
export interface OwnerStats {
  total: number;
  underReview: number;
  active: number;
  rejected: number;
  suspended: number;
  blocked: number;
}

// ---------------------------------------------------------------------------
// Wire DTO (snake_case, bplay-backend) + normaliser
// ---------------------------------------------------------------------------

export interface OwnerDocumentDto {
  id?: string;
  doc_type?: string;
  file_url?: string;
  status?: string;
  reject_reason?: string | null;
  uploaded_at?: string;
}

export interface OwnerFacilityDto {
  id?: string;
  name?: string;
  approval_status?: string;
  city?: string | null;
  rating?: number | null;
}

export interface OwnerDto {
  /** facility_owners.id — the id every /owners/:id route expects. */
  owner_id?: string;
  /** users.id — a DIFFERENT row; never use it to address an owner. */
  user_id?: string;
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  email?: string;
  phone?: string | null;
  phone_business?: string | null;
  national_id?: string | null;
  date_of_birth?: string | null;
  photo_url?: string | null;
  city?: string | null;
  address?: string | null;
  trust_tier?: string;
  approval_status?: string;
  rejection_reason?: string | null;
  ban_reason?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  /** Detail spelling. */
  is_suspended?: boolean;
  /** List spelling (same signal, different alias in the list schema). */
  is_suspend?: boolean;
  facilities_count?: number;
  stats?: { total_facilities?: number; active_facilities?: number; pending_facilities?: number };
  documents?: OwnerDocumentDto[];
  facilities?: OwnerFacilityDto[];
  created_at?: string;
}

const DOC_TYPES: OwnerDocType[] = [
  'national_id',
  'business_license',
  'tax_certificate',
  'ownership_proof',
  'other',
];
const TRUST_TIERS: OwnerTrustTier[] = ['basic', 'verified', 'premium'];

/**
 * Collapse the backend's three signals into the one state the dashboard shows.
 * Precedence matches the server's own filters and KPI buckets, so a row never
 * lands in a bucket the list filter would exclude it from.
 */
function resolveAccountStatus(dto: OwnerDto): OwnerAccountStatus {
  if (dto.is_suspended || dto.is_suspend) return 'suspended';

  switch ((dto.approval_status ?? '').toLowerCase()) {
    case 'approved':
      return 'active';
    case 'rejected':
      return 'rejected';
    // The enum carries this value even though the lifecycle service records a
    // suspension on users.is_suspended instead — treat it as the same state.
    case 'owner_suspended':
      return 'suspended';
    default:
      return 'under_review';
  }
}

function normalizeDocType(value: string | undefined): OwnerDocType {
  const s = (value ?? '').toLowerCase();
  return (DOC_TYPES as string[]).includes(s) ? (s as OwnerDocType) : 'other';
}

/** Wire pending|approved|rejected → UI under_review|accepted|rejected. */
function normalizeDocStatus(value: string | undefined): OwnerDocStatus {
  switch ((value ?? '').toLowerCase()) {
    case 'approved':
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
    default:
      return 'under_review';
  }
}

function normalizeTrustTier(value: string | undefined): OwnerTrustTier {
  const s = (value ?? '').toLowerCase();
  return (TRUST_TIERS as string[]).includes(s) ? (s as OwnerTrustTier) : 'basic';
}

/** An image vs a PDF/other file. The backend stores only a URL, so extension it is. */
function documentKind(url: string): 'image' | 'pdf' {
  return /\.(png|jpe?g|webp|gif|bmp|heic)(\?|$)/i.test(url) ? 'image' : 'pdf';
}

export function toOwner(dto: OwnerDto): Owner {
  // owner_id FIRST: the detail response carries BOTH ids, and addressing an
  // owner by user_id makes every approve/reject 404.
  const id = dto.owner_id ?? dto.user_id ?? '';

  const documentsLoaded = Array.isArray(dto.documents);
  const documents: OwnerDocument[] = Array.isArray(dto.documents)
    ? dto.documents.map((document, index) => {
        // Resolved against the API origin: a stored `/uploads/…` would otherwise
        // resolve against the dashboard and preview the SPA's own index.html.
        const url = resolveUploadUrl(document.file_url) ?? '';
        return {
          id: String(document.id ?? index),
          type: normalizeDocType(document.doc_type),
          status: normalizeDocStatus(document.status),
          rejectionReason: document.reject_reason ?? undefined,
          url,
          kind: documentKind(url),
          uploadedAt: document.uploaded_at,
        };
      })
    : [];

  const legalName = dto.full_name ?? undefined;
  const city = dto.city ?? undefined;

  return {
    id: String(id),
    name: dto.display_name ?? legalName ?? '',
    legalName,
    email: dto.email ?? '',
    phone: dto.phone ?? dto.phone_business ?? '',
    nationalId: dto.national_id ?? undefined,
    dateOfBirth: dto.date_of_birth ?? undefined,
    // Resolved for the same reason the KYC documents below are: a row stamped
    // with an empty or scheme-less APP_URL otherwise points at the dashboard's
    // own host and the owner's avatar renders broken on every screen.
    photoUrl: resolveUploadUrl(dto.photo_url),
    city,
    address: dto.address ?? undefined,
    bio: dto.bio ?? undefined,
    // The backend keeps no website/intent/revenue for an owner yet; the cards
    // that read them simply omit their row.
    region: city ?? '',
    accountStatus: resolveAccountStatus(dto),
    statusReason: dto.rejection_reason ?? undefined,
    // A ban is users.is_active = false; the flag is absent on partial payloads,
    // where "not blocked" is the safe read.
    isBlocked: dto.is_active === false,
    blockedReason: dto.ban_reason ?? undefined,
    trustTier: normalizeTrustTier(dto.trust_tier),
    isVerified: dto.is_verified,
    facilitiesCount: dto.facilities_count ?? dto.stats?.total_facilities,
    documents,
    documentsLoaded,
    createdAt: dto.created_at,
  };
}

/** Registration-date window (relative to now) for the "Joined" filter. */
export type OwnerJoinedWindow = 'all' | '7d' | '30d' | '90d' | 'year';

export interface OwnerListParams {
  q?: string;
  /** Account state filter (single, SRS-aligned): under_review/active/rejected/suspended/blocked. */
  status?: 'all' | OwnerState;
  /** Facility ownership: none (0) or has (≥1). */
  facilities?: 'all' | 'none' | 'has';
  /** Registration recency window (SRS: registration-date filter). */
  joined?: OwnerJoinedWindow;
  page?: number;
  pageSize?: number;
}

export interface OwnerListResult {
  items: Owner[];
  total: number;
  page: number;
  pageCount: number;
}

/** Admin-created owner — data taken from the app's signup (FR-ADM-OWNER-005). */
export interface CreateOwnerInput {
  name: string;
  email: string;
  /** 9-digit local part; the api prepends 963. */
  phone: string;
  nationalId: string;
  address?: string;
}

/**
 * Admin-edited owner details.
 *
 * Name and address ONLY — the endpoint refuses email, phone and national ID
 * (ERR_FIELD_NOT_EDITABLE): the first two are login identifiers and the third is
 * the KYC identity the approved documents attest to.
 */
export interface EditOwnerInput {
  name: string;
  address?: string;
}

/** The result of creating an owner — carries the one-time temporary password. */
export interface CreatedOwner {
  owner: Owner;
  tempPassword: string;
}
