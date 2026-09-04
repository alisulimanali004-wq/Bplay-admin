import { mockDelay } from '@shared/lib/mock';
import { haversineKm } from '@shared/lib/geo';
import { useAuthStore } from '@shared/stores/authStore';
import { getScopeRegions } from '@features/region-management/api';
import { getOwnerById } from '@features/owner-management/api';
import { buildFacilityListResult, computeFacilityStats, type AdminScope } from './facility.filter';
import { facilityDocsAllApproved, facilityDocumentKind, toRegionFacility } from './facility.types';
import type {
  BulkActionResult,
  BulkFacilityAction,
  BulkSkip,
  CancelPolicy,
  ClubFacility,
  Court,
  CourtInput,
  DayHours,
  Facility,
  FacilityDocument,
  FacilityDocAction,
  FacilitySource,
  FacilityListParams,
  FacilityListResult,
  FacilityLocation,
  FacilityStatistics,
  FacilityStats,
  FacilityStatus,
  CreateFacilityInput,
  PitchFacility,
  PitchSpecs,
  RegionFacility,
  SportType,
  PitchSurface,
  UpdateFacilityInput,
  WorkingHours,
} from './facility.types';

// ---------------------------------------------------------------------------
// Seed helpers (deterministic, computed once at module load)
// ---------------------------------------------------------------------------

const NOW = Date.now();

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return hoursAgo(days * 24);
}

function images(id: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `https://picsum.photos/seed/bplay-${id}-${index + 1}/900/600`,
  );
}

type DocName = 'Business License' | 'Ownership Proof' | 'Tax Certificate';
type DocStatus = 'approved' | 'pending';

// Real, viewable sample files so the document viewer works pre-backend: licenses
// and certificates as an embedded PDF, ownership proofs as a scanned image.
const SAMPLE_DOC_PDF = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';
const sampleDocImage = (seed: string): string => `https://picsum.photos/seed/${seed}/1000/700`;

function docs(facilityId: string, entries: Array<[DocName, DocStatus]>): FacilityDocument[] {
  return entries.map(([name, status], index) => {
    const kind: 'image' | 'pdf' = name === 'Ownership Proof' ? 'image' : 'pdf';
    return {
      id: `${facilityId}-d${index + 1}`,
      name,
      status,
      url: kind === 'pdf' ? SAMPLE_DOC_PDF : sampleDocImage(`${facilityId}-d${index + 1}`),
      kind,
    };
  });
}

function zeroStats(): FacilityStatistics {
  return { avgRating: 0, reviewCount: 0, totalBookings: 0, occupancyPercent: 0, revenueSyp: 0, todayBookings: 0 };
}

// The mock keeps supplying occupancy/revenue (its own dashboard tiles read them)
// AND now the three the real endpoint returns, so mock and live agree on shape.
// `totalBookings` is derived from the daily figure so the two stay plausible.
function stats(occupancyPercent: number, revenueSyp: number, todayBookings: number): FacilityStatistics {
  return {
    avgRating: 0,
    reviewCount: 0,
    totalBookings: todayBookings * 30,
    occupancyPercent,
    revenueSyp,
    todayBookings,
  };
}

/** 09:00–23:00 every day unless overridden (5 = Friday for the usual variations). */
function weekHours(overrides: Partial<Record<number, DayHours>> = {}): WorkingHours {
  const week: WorkingHours = {};
  for (let day = 1; day <= 7; day += 1) {
    week[day] = overrides[day] ?? { isOpen: true, openTime: '09:00', closeTime: '23:00' };
  }
  return week;
}

let courtSeq = 0;

function court(
  name: string,
  sport: SportType,
  pricePerHour: number,
  surface: PitchSurface,
  opts: { isIndoor?: boolean; hasLighting?: boolean; capacity?: number; isActive?: boolean } = {},
): Court {
  courtSeq += 1;
  return {
    id: `crt-${courtSeq}`,
    name,
    sport,
    pricePerHour,
    surface,
    isIndoor: opts.isIndoor ?? false,
    hasLighting: opts.hasLighting ?? true,
    capacity: opts.capacity,
    isActive: opts.isActive ?? true,
  };
}

/** Owner avatar photos, matched to the owner-management seeds so the same owner
 *  shows the same face wherever their cell appears (real backend supplies this). */
const OWNER_PHOTO: Record<string, number> = {
  '300': 11, '301': 45, '302': 13, '303': 5, '304': 14, '306': 33,
  '308': 52, '309': 9, '310': 15, '311': 47, '312': 60,
};
const ownerPhoto = (ownerId: string): string | undefined =>
  ownerId in OWNER_PHOTO ? `https://i.pravatar.cc/512?img=${OWNER_PHOTO[ownerId]}` : undefined;

interface ClubSpec {
  id: string;
  name: string;
  status: FacilityStatus;
  location: FacilityLocation;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  source?: FacilitySource;
  sports: SportType[];
  courts: Court[];
  imageCount: number;
  documents: FacilityDocument[];
  statistics: FacilityStatistics;
  workingHours?: WorkingHours;
  description?: string;
  contactPhone?: string;
  logoUrl?: string;
  rating?: number;
  adminNotes?: string;
  suspensionReason?: string;
}

function makeClub(spec: ClubSpec): ClubFacility {
  return {
    kind: 'club',
    source: spec.source ?? 'owner',
    id: spec.id,
    name: spec.name,
    status: spec.status,
    location: spec.location,
    images: images(spec.id, spec.imageCount),
    ownerId: spec.ownerId,
    ownerName: spec.ownerName,
    ownerPhotoUrl: ownerPhoto(spec.ownerId),
    createdAt: spec.createdAt,
    adminNotes: spec.adminNotes,
    suspensionReason: spec.suspensionReason,
    rating: spec.rating,
    documents: spec.documents,
    statistics: spec.statistics,
    description: spec.description,
    logoUrl: spec.logoUrl,
    sports: spec.sports,
    workingHours: spec.workingHours ?? weekHours(),
    contactPhone: spec.contactPhone,
    courts: spec.courts,
  };
}

interface PitchSpec {
  id: string;
  name: string;
  status: FacilityStatus;
  location: FacilityLocation;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  source?: FacilitySource;
  sport: SportType;
  pricePerHour: number;
  specs: PitchSpecs;
  cancelPolicy: CancelPolicy;
  imageCount: number;
  documents: FacilityDocument[];
  statistics: FacilityStatistics;
  capacity?: number;
  rating?: number;
  adminNotes?: string;
  suspensionReason?: string;
}

function makePitch(spec: PitchSpec): PitchFacility {
  return {
    kind: 'pitch',
    source: spec.source ?? 'owner',
    id: spec.id,
    name: spec.name,
    status: spec.status,
    location: spec.location,
    images: images(spec.id, spec.imageCount),
    ownerId: spec.ownerId,
    ownerName: spec.ownerName,
    ownerPhotoUrl: ownerPhoto(spec.ownerId),
    createdAt: spec.createdAt,
    adminNotes: spec.adminNotes,
    suspensionReason: spec.suspensionReason,
    rating: spec.rating,
    documents: spec.documents,
    statistics: spec.statistics,
    sport: spec.sport,
    pricePerHour: spec.pricePerHour,
    capacity: spec.capacity,
    specs: spec.specs,
    cancelPolicy: spec.cancelPolicy,
  };
}

// ---------------------------------------------------------------------------
// Seeds — 24 facilities (6 pending / 10 active / 3 rejected / 3 suspended /
// 2 owner_suspended; 15 clubs / 9 pitches). Owner id+name pairs mirror the
// owner-management mock seeds ('300'..'313'). Hama (f21) sits inside the
// INACTIVE c5 circle → effectively an orphan (deliberate edge case).
// ---------------------------------------------------------------------------

// In-memory mutable db: mutations persist for the session and a refetch sees them.
const db: Facility[] = [
  // --- Damascus ×8 -------------------------------------------------------
  makeClub({
    id: 'f1',
    name: 'Al-Baramkeh Sports Club',
    status: 'pending',
    location: { lat: 33.509, lng: 36.287, address: '12 Baramkeh Main St', city: 'Damascus', district: 'Baramkeh', governorate: 'damascus' },
    ownerId: '300',
    ownerName: 'Fadi Barakat',
    createdAt: hoursAgo(5),
    sports: ['tennis', 'padel'],
    description: 'Family-run racquet club in the heart of Baramkeh with two padel cages and a championship tennis court.',
    contactPhone: '+963 11 212 4501',
    courts: [
      court('Center Court', 'tennis', 60_000, 'hardcourt'),
      court('Padel Cage 1', 'padel', 45_000, 'artificial', { isIndoor: true }),
      court('Padel Cage 2', 'padel', 45_000, 'artificial', { isIndoor: true }),
    ],
    imageCount: 4,
    documents: docs('f1', [['Business License', 'pending'], ['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),
  makePitch({
    id: 'f2',
    name: 'Mezzeh Padel Arena',
    status: 'pending',
    location: { lat: 33.5015, lng: 36.2532, address: 'Mezzeh Highway, next to the Western Villas', city: 'Damascus', district: 'Mezzeh', governorate: 'damascus' },
    ownerId: '301',
    ownerName: 'Rana Suleiman',
    createdAt: hoursAgo(60),
    sport: 'padel',
    pricePerHour: 55_000,
    specs: { surface: 'artificial', isIndoor: true, hasLighting: true, hasParking: true, hasLockerRoom: true, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 24, penaltyPercent: 0 },
    imageCount: 2,
    documents: docs('f2', [['Business License', 'pending']]),
    statistics: zeroStats(),
  }),
  makeClub({
    id: 'f3',
    name: 'Qasioun Heights Club',
    source: 'admin',
    status: 'active',
    location: { lat: 33.5525, lng: 36.291, address: 'Qasioun Foothill Rd 4', city: 'Damascus', district: 'Muhajreen', governorate: 'damascus' },
    ownerId: '302',
    ownerName: 'Omar Khoury',
    createdAt: daysAgo(210),
    sports: ['football', 'basketball', 'swimming'],
    description: 'Panoramic multi-sport complex on the slopes of Mount Qasioun — a full-size pitch, indoor courts and an olympic pool.',
    contactPhone: '+963 11 331 8020',
    logoUrl: 'https://picsum.photos/seed/bplay-f3-logo/200/200',
    rating: 4.6,
    courts: [
      court('Main Pitch', 'football', 90_000, 'artificial', { capacity: 22 }),
      court('Court A', 'basketball', 50_000, 'hardcourt', { isIndoor: true }),
      court('Court B', 'basketball', 48_000, 'hardcourt', { isIndoor: true, isActive: false }),
      court('Olympic Pool', 'swimming', 70_000, 'hardcourt', { isIndoor: true }),
    ],
    imageCount: 5,
    documents: docs('f3', [['Business License', 'approved'], ['Ownership Proof', 'approved'], ['Tax Certificate', 'approved']]),
    statistics: stats(78, 5_200_000, 11),
  }),
  makePitch({
    id: 'f4',
    name: 'Barada Riverside Pitch',
    status: 'active',
    location: { lat: 33.521, lng: 36.3125, address: 'Barada River Walk 9', city: 'Damascus', district: 'Old City', governorate: 'damascus' },
    ownerId: '303',
    ownerName: 'Lina Nasser',
    createdAt: daysAgo(140),
    sport: 'football',
    pricePerHour: 40_000,
    capacity: 14,
    rating: 3.8,
    specs: { surface: 'artificial', isIndoor: false, hasLighting: true, hasParking: true, hasLockerRoom: false, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 48, penaltyPercent: 25 },
    imageCount: 3,
    documents: docs('f4', [['Business License', 'approved']]),
    statistics: stats(56, 1_850_000, 6),
  }),
  makeClub({
    id: 'f5',
    name: 'Abu Rummaneh Racquet Club',
    status: 'active',
    location: { lat: 33.5178, lng: 36.2688, address: 'Abu Rummaneh Blvd 27', city: 'Damascus', district: 'Abu Rummaneh', governorate: 'damascus' },
    ownerId: '309',
    ownerName: 'Dina Saab',
    createdAt: daysAgo(95),
    sports: ['padel', 'tennis'],
    description: 'Boutique racquet club with red-clay courts and a covered padel dome.',
    contactPhone: '+963 11 444 2711',
    rating: 4.2,
    workingHours: weekHours({ 5: { isOpen: true, openTime: '14:00', closeTime: '23:00' } }),
    courts: [
      court('Clay Court 1', 'tennis', 55_000, 'clay'),
      court('Clay Court 2', 'tennis', 55_000, 'clay'),
      court('Padel Dome', 'padel', 65_000, 'artificial', { isIndoor: true }),
    ],
    imageCount: 4,
    documents: docs('f5', [['Business License', 'approved'], ['Tax Certificate', 'approved']]),
    statistics: stats(64, 2_900_000, 8),
  }),
  makeClub({
    id: 'f6',
    name: 'Kafr Souseh Football Center',
    status: 'rejected',
    location: { lat: 33.487, lng: 36.2765, address: 'Kafr Souseh Square 3', city: 'Damascus', district: 'Kafr Souseh', governorate: 'damascus' },
    ownerId: '304',
    ownerName: 'Karim Aziz',
    createdAt: daysAgo(12),
    sports: ['football'],
    contactPhone: '+963 11 662 0043',
    adminNotes: 'Business license photo is unreadable — please re-upload a clear scan.',
    courts: [
      court('Field One', 'football', 42_000, 'artificial', { capacity: 14 }),
      court('Field Two', 'football', 42_000, 'artificial', { capacity: 14, hasLighting: false }),
    ],
    imageCount: 4,
    documents: docs('f6', [['Business License', 'pending'], ['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),
  makeClub({
    id: 'f7',
    name: 'Umayyad Aquatic & Tennis Club',
    status: 'suspended',
    location: { lat: 33.5138, lng: 36.2942, address: 'Umayyad Square Annex 1', city: 'Damascus', district: 'Salhiyeh', governorate: 'damascus' },
    ownerId: '305',
    ownerName: 'Maya Fares',
    createdAt: daysAgo(300),
    sports: ['swimming', 'tennis'],
    description: 'Historic city club with a heated indoor pool and three tennis courts.',
    contactPhone: '+963 11 223 9188',
    logoUrl: 'https://picsum.photos/seed/bplay-f7-logo/200/200',
    rating: 4.4,
    suspensionReason: 'Multiple verified complaints about double-booked courts. Suspended pending investigation.',
    courts: [
      court('Heated Pool', 'swimming', 75_000, 'hardcourt', { isIndoor: true }),
      court('Grass Court', 'tennis', 68_000, 'grass'),
      court('Night Court', 'tennis', 58_000, 'hardcourt'),
    ],
    imageCount: 5,
    documents: docs('f7', [['Business License', 'approved'], ['Ownership Proof', 'approved'], ['Tax Certificate', 'approved']]),
    statistics: stats(61, 3_400_000, 0),
  }),
  makePitch({
    id: 'f8',
    name: 'Malki Tennis Court',
    status: 'owner_suspended',
    location: { lat: 33.5102, lng: 36.268, address: 'Malki Gardens 14', city: 'Damascus', district: 'Malki', governorate: 'damascus' },
    ownerId: '311',
    ownerName: 'Yasmin Deeb',
    createdAt: daysAgo(75),
    sport: 'tennis',
    pricePerHour: 35_000,
    rating: 4.0,
    specs: { surface: 'hardcourt', isIndoor: false, hasLighting: true, hasParking: false, hasLockerRoom: false, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 24, penaltyPercent: 0 },
    imageCount: 2,
    documents: docs('f8', [['Business License', 'approved']]),
    statistics: stats(49, 900_000, 0),
  }),

  // --- Aleppo ×4 ----------------------------------------------------------
  makeClub({
    id: 'f9',
    name: 'Aleppo Champions Academy',
    status: 'pending',
    location: { lat: 36.2085, lng: 37.1553, address: 'New Aleppo Ring Rd 22', city: 'Aleppo', district: 'New Aleppo', governorate: 'aleppo' },
    ownerId: '308',
    ownerName: 'Hadi Rahal',
    createdAt: hoursAgo(30),
    sports: ['football', 'volleyball'],
    description: 'Youth football academy with two training pitches and an indoor volleyball hall.',
    contactPhone: '+963 21 268 5540',
    workingHours: weekHours({ 5: { isOpen: false } }),
    courts: [
      court('Academy Pitch 1', 'football', 42_000, 'artificial', { capacity: 14 }),
      court('Academy Pitch 2', 'football', 42_000, 'grass', { capacity: 22 }),
      court('Volleyball Hall', 'volleyball', 38_000, 'hardcourt', { isIndoor: true }),
    ],
    imageCount: 4,
    documents: docs('f9', [['Business License', 'approved'], ['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),
  makeClub({
    id: 'f10',
    name: 'Citadel Sports Complex',
    source: 'admin',
    status: 'active',
    location: { lat: 36.199, lng: 37.162, address: 'Citadel View St 8', city: 'Aleppo', district: 'Aziziyeh', governorate: 'aleppo' },
    ownerId: '308',
    ownerName: 'Hadi Rahal',
    createdAt: daysAgo(260),
    sports: ['basketball', 'volleyball'],
    description: 'The busiest indoor arena in Aleppo — two show courts, a sand court and a training hall.',
    contactPhone: '+963 21 212 7789',
    logoUrl: 'https://picsum.photos/seed/bplay-f10-logo/200/200',
    rating: 4.9,
    courts: [
      court('Arena A', 'basketball', 75_000, 'hardcourt', { isIndoor: true }),
      court('Arena B', 'basketball', 70_000, 'hardcourt', { isIndoor: true }),
      court('Beach Court', 'volleyball', 55_000, 'sand'),
      court('Training Hall', 'volleyball', 40_000, 'hardcourt', { isIndoor: true, isActive: false }),
      court('Rooftop Court', 'basketball', 60_000, 'hardcourt'),
    ],
    imageCount: 5,
    documents: docs('f10', [['Business License', 'approved'], ['Ownership Proof', 'approved'], ['Tax Certificate', 'approved']]),
    statistics: stats(92, 6_800_000, 14),
  }),
  makePitch({
    id: 'f11',
    name: 'Al-Aziziyah Community Pitch',
    status: 'active',
    location: { lat: 36.221, lng: 37.1015, address: 'Aziziyah Park Gate 2', city: 'Aleppo', district: 'Al-Aziziyah', governorate: 'aleppo' },
    ownerId: '310',
    ownerName: 'Tarek Mansour',
    createdAt: daysAgo(50),
    sport: 'football',
    pricePerHour: 25_000,
    capacity: 10,
    rating: 3.5,
    specs: { surface: 'artificial', isIndoor: false, hasLighting: false, hasParking: false, hasLockerRoom: false, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 24, penaltyPercent: 0 },
    imageCount: 2,
    documents: docs('f11', [['Business License', 'approved']]),
    statistics: stats(35, 450_000, 2),
  }),
  makeClub({
    id: 'f12',
    name: 'Shahba Tennis Club',
    status: 'rejected',
    location: { lat: 36.1755, lng: 37.131, address: 'Shahba Mall Rd 5', city: 'Aleppo', district: 'Shahba', governorate: 'aleppo' },
    ownerId: '312',
    ownerName: 'Samer Wehbe',
    createdAt: daysAgo(18),
    sports: ['tennis'],
    contactPhone: '+963 21 447 3320',
    adminNotes: 'Submitted photos do not match the declared location. Please add real photos of the venue.',
    courts: [
      court('Clay One', 'tennis', 50_000, 'clay'),
      court('Clay Two', 'tennis', 50_000, 'clay', { hasLighting: false }),
    ],
    imageCount: 4,
    documents: docs('f12', [['Business License', 'pending'], ['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),

  // --- Homs ×3 ------------------------------------------------------------
  makeClub({
    id: 'f13',
    name: 'Al-Waer Community Club',
    status: 'pending',
    location: { lat: 34.7269, lng: 36.702, address: 'Al-Waer Corniche 11', city: 'Homs', district: 'Al-Waer', governorate: 'homs' },
    ownerId: '310',
    ownerName: 'Tarek Mansour',
    createdAt: hoursAgo(10),
    sports: ['football', 'basketball'],
    description: 'Neighbourhood club rebuilt in 2025 — a five-a-side pitch and an open-air basketball court.',
    contactPhone: '+963 31 245 6612',
    courts: [
      court('Pitch One', 'football', 30_000, 'artificial', { capacity: 10 }),
      court('Open Court', 'basketball', 32_000, 'hardcourt'),
    ],
    imageCount: 4,
    documents: docs('f13', [['Business License', 'pending'], ['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),
  makeClub({
    id: 'f14',
    name: 'Orontes Sports City',
    status: 'active',
    location: { lat: 34.745, lng: 36.7215, address: 'Orontes River Rd 30', city: 'Homs', district: 'Inshaat', governorate: 'homs' },
    ownerId: '302',
    ownerName: 'Omar Khoury',
    createdAt: daysAgo(180),
    sports: ['swimming', 'football'],
    description: 'Large riverside complex with a grand grass pitch, five-a-side cage and an indoor pool.',
    contactPhone: '+963 31 212 9904',
    rating: 4.1,
    workingHours: weekHours({ 5: { isOpen: true, openTime: '13:00', closeTime: '22:00' } }),
    courts: [
      court('Grand Pitch', 'football', 85_000, 'grass', { capacity: 22 }),
      court('Five-a-side Cage', 'football', 45_000, 'artificial', { capacity: 10 }),
      court('Indoor Pool', 'swimming', 60_000, 'hardcourt', { isIndoor: true }),
    ],
    imageCount: 5,
    documents: docs('f14', [['Business License', 'approved'], ['Ownership Proof', 'approved'], ['Tax Certificate', 'approved']]),
    statistics: stats(72, 4_100_000, 9),
  }),
  makePitch({
    id: 'f15',
    name: 'Khalidiya Basketball Court',
    status: 'suspended',
    location: { lat: 34.738, lng: 36.6905, address: 'Khalidiya Main St 7', city: 'Homs', district: 'Khalidiya', governorate: 'homs' },
    ownerId: '306',
    ownerName: 'Ziad Halabi',
    createdAt: daysAgo(120),
    sport: 'basketball',
    pricePerHour: 28_000,
    rating: 3.6,
    suspensionReason: 'Repeated no-show on confirmed bookings reported by players.',
    specs: { surface: 'hardcourt', isIndoor: false, hasLighting: true, hasParking: false, hasLockerRoom: false, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 24, penaltyPercent: 0 },
    imageCount: 2,
    documents: docs('f15', [['Business License', 'approved']]),
    statistics: stats(44, 700_000, 0),
  }),

  // --- Latakia ×3 ---------------------------------------------------------
  makePitch({
    id: 'f16',
    name: 'Latakia Coastal Pitch',
    status: 'pending',
    location: { lat: 35.524, lng: 35.777, address: 'Southern Corniche 18', city: 'Latakia', district: 'Corniche', governorate: 'latakia' },
    ownerId: '303',
    ownerName: 'Lina Nasser',
    createdAt: hoursAgo(75),
    sport: 'padel',
    pricePerHour: 50_000,
    specs: { surface: 'artificial', isIndoor: false, hasLighting: true, hasParking: true, hasLockerRoom: false, hasCafe: true },
    cancelPolicy: { freeHoursBefore: 48, penaltyPercent: 25 },
    imageCount: 3,
    documents: docs('f16', [['Business License', 'pending'], ['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),
  makeClub({
    id: 'f17',
    name: 'Blue Beach Sports Club',
    status: 'active',
    location: { lat: 35.545, lng: 35.7905, address: 'Blue Beach Resort Rd 2', city: 'Latakia', district: 'Al-Ziraa', governorate: 'latakia' },
    ownerId: '311',
    ownerName: 'Yasmin Deeb',
    createdAt: daysAgo(230),
    sports: ['tennis', 'padel', 'swimming'],
    description: 'Seaside resort club — clay courts with a sea view, a covered padel bay and a lagoon pool.',
    contactPhone: '+963 41 478 1201',
    logoUrl: 'https://picsum.photos/seed/bplay-f17-logo/200/200',
    rating: 4.7,
    courts: [
      court('Seaside Tennis 1', 'tennis', 65_000, 'clay'),
      court('Seaside Tennis 2', 'tennis', 65_000, 'clay'),
      court('Padel Bay', 'padel', 70_000, 'artificial', { isIndoor: true }),
      court('Lagoon Pool', 'swimming', 80_000, 'hardcourt'),
    ],
    imageCount: 5,
    documents: docs('f17', [['Business License', 'approved'], ['Ownership Proof', 'approved'], ['Tax Certificate', 'approved']]),
    statistics: stats(85, 5_900_000, 12),
  }),
  makeClub({
    id: 'f18',
    name: 'Tishreen Stadium Annex',
    status: 'suspended',
    location: { lat: 35.5165, lng: 35.7738, address: 'Stadium Ring Rd 1', city: 'Latakia', district: 'Tishreen', governorate: 'latakia' },
    ownerId: '303',
    ownerName: 'Lina Nasser',
    createdAt: daysAgo(160),
    sports: ['volleyball', 'basketball'],
    contactPhone: '+963 41 233 8845',
    rating: 4.3,
    suspensionReason: 'Safety inspection failed — floodlight wiring must be certified before reactivation.',
    courts: [
      court('Annex Hall A', 'volleyball', 36_000, 'hardcourt', { isIndoor: true }),
      court('Annex Hall B', 'basketball', 42_000, 'hardcourt', { isIndoor: true, isActive: false }),
    ],
    imageCount: 4,
    documents: docs('f18', [['Business License', 'approved'], ['Ownership Proof', 'approved']]),
    statistics: stats(58, 2_200_000, 0),
  }),

  // --- Tartus ×2 ----------------------------------------------------------
  makePitch({
    id: 'f19',
    name: 'Tartus Marina Pitch',
    source: 'admin',
    status: 'active',
    location: { lat: 34.893, lng: 35.879, address: 'Marina Walk 6', city: 'Tartus', district: 'Marina', governorate: 'tartus' },
    ownerId: '304',
    ownerName: 'Karim Aziz',
    createdAt: daysAgo(60),
    sport: 'football',
    pricePerHour: 32_000,
    capacity: 12,
    rating: 3.2,
    specs: { surface: 'artificial', isIndoor: false, hasLighting: true, hasParking: true, hasLockerRoom: false, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 24, penaltyPercent: 0 },
    imageCount: 3,
    documents: docs('f19', [['Business License', 'approved']]),
    statistics: stats(41, 800_000, 3),
  }),
  makeClub({
    id: 'f20',
    name: 'Arwad View Sports Club',
    status: 'owner_suspended',
    location: { lat: 34.8825, lng: 35.894, address: 'Old Harbour St 19', city: 'Tartus', district: 'Old Harbour', governorate: 'tartus' },
    ownerId: '304',
    ownerName: 'Karim Aziz',
    createdAt: daysAgo(110),
    sports: ['football', 'swimming'],
    description: 'Harbour-front club overlooking Arwad island, closed by the owner for winter renovations.',
    contactPhone: '+963 43 315 6673',
    rating: 3.7,
    workingHours: weekHours({ 5: { isOpen: false } }),
    courts: [
      court('Harbour Pitch', 'football', 38_000, 'artificial', { capacity: 14 }),
      court('Club Pool', 'swimming', 50_000, 'hardcourt', { isIndoor: true }),
    ],
    imageCount: 4,
    documents: docs('f20', [['Business License', 'approved'], ['Ownership Proof', 'approved']]),
    statistics: stats(52, 1_600_000, 0),
  }),

  // --- Hama ×1 (inside the INACTIVE c5 circle → effectively an orphan) ----
  makeClub({
    id: 'f21',
    name: 'Hama Norias Sports Club',
    status: 'active',
    location: { lat: 35.1355, lng: 36.749, address: 'Norias Park Rd 3', city: 'Hama', district: 'Al-Hader', governorate: 'hama' },
    ownerId: '306',
    ownerName: 'Ziad Halabi',
    createdAt: daysAgo(85),
    sports: ['football', 'tennis'],
    description: 'Riverside club beside the famous waterwheels of Hama.',
    contactPhone: '+963 33 221 4409',
    rating: 3.9,
    courts: [
      court('Noria Pitch', 'football', 34_000, 'artificial', { capacity: 14 }),
      court('River Court', 'tennis', 30_000, 'clay', { hasLighting: false }),
    ],
    imageCount: 4,
    documents: docs('f21', [['Business License', 'approved'], ['Tax Certificate', 'approved']]),
    statistics: stats(47, 1_200_000, 4),
  }),

  // --- True orphans (Deir ez-Zor / Raqqa / Daraa) --------------------------
  makeClub({
    id: 'f22',
    name: 'Euphrates Sports Academy',
    status: 'pending',
    location: { lat: 35.33, lng: 40.14, address: 'Euphrates Corniche 44', city: 'Deir ez-Zor', district: 'Al-Qusour', governorate: 'deir_ez_zor' },
    ownerId: '300',
    ownerName: 'Fadi Barakat',
    createdAt: hoursAgo(40),
    sports: ['football', 'basketball'],
    description: 'The first bookable academy east of the Euphrates — grass field plus a youth court.',
    contactPhone: '+963 51 335 2210',
    courts: [
      court('Academy Field', 'football', 30_000, 'grass', { capacity: 22 }),
      court('Youth Court', 'basketball', 30_000, 'hardcourt'),
    ],
    imageCount: 4,
    documents: docs('f22', [['Business License', 'pending'], ['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),
  makePitch({
    id: 'f23',
    name: 'Raqqa North Pitch',
    status: 'active',
    location: { lat: 35.95, lng: 39.01, address: 'North District Rd 12', city: 'Raqqa', district: 'Al-Mashlab', governorate: 'raqqa' },
    ownerId: '300',
    ownerName: 'Fadi Barakat',
    createdAt: daysAgo(40),
    sport: 'football',
    pricePerHour: 26_000,
    capacity: 10,
    rating: 3.4,
    specs: { surface: 'artificial', isIndoor: false, hasLighting: false, hasParking: false, hasLockerRoom: false, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 24, penaltyPercent: 0 },
    imageCount: 2,
    documents: docs('f23', [['Business License', 'pending']]),
    statistics: stats(38, 520_000, 1),
  }),
  makePitch({
    id: 'f24',
    name: 'Hauran Volleyball Ground',
    status: 'rejected',
    location: { lat: 32.62, lng: 36.1, address: 'Hauran Plain Rd 5', city: 'Daraa', district: 'Al-Kashef', governorate: 'daraa' },
    ownerId: '309',
    ownerName: 'Dina Saab',
    createdAt: daysAgo(22),
    sport: 'volleyball',
    pricePerHour: 25_000,
    adminNotes: 'Ownership proof document is expired. Upload a valid document issued within the last year.',
    specs: { surface: 'sand', isIndoor: false, hasLighting: false, hasParking: false, hasLockerRoom: false, hasCafe: false },
    cancelPolicy: { freeHoursBefore: 24, penaltyPercent: 0 },
    imageCount: 2,
    documents: docs('f24', [['Ownership Proof', 'pending']]),
    statistics: zeroStats(),
  }),
];

let seq = 24;

// ---------------------------------------------------------------------------
// Scope — read outside React exactly like apiClient reads the token
// ---------------------------------------------------------------------------

function currentScope(): AdminScope {
  const { role, user } = useAuthStore.getState();
  return { role, assignedRegionIds: user?.assignedRegionIds };
}

function findOrThrow(id: string): Facility {
  const facility = db.find((item) => item.id === id);
  if (!facility) throw new Error('Facility not found');
  return facility;
}

// ---------------------------------------------------------------------------
// API surface (mirrors facility.api.ts exactly)
// ---------------------------------------------------------------------------

export async function getFacilities(params: FacilityListParams): Promise<FacilityListResult> {
  await mockDelay();
  const regions = await getScopeRegions();
  return buildFacilityListResult([...db], params, regions, currentScope());
}

export async function getPendingFacilities(
  params: FacilityListParams,
): Promise<FacilityListResult> {
  return getFacilities({ ...params, status: 'pending' });
}

export async function getFacilityById(id: string): Promise<Facility> {
  await mockDelay();
  const facility = db.find((item) => item.id === id);
  if (!facility) throw new Error('Facility not found');
  const regions = await getScopeRegions();
  const visible = buildFacilityListResult([facility], { page: 1, pageSize: 1 }, regions, currentScope());
  if (visible.total === 0) throw new Error('Facility not found');
  return facility.kind === 'club'
    ? {
        ...facility,
        documents: facility.documents.map((doc) => ({ ...doc })),
        courts: facility.courts.map((item) => ({ ...item })),
      }
    : { ...facility, documents: facility.documents.map((doc) => ({ ...doc })) };
}

export async function approveFacility(id: string): Promise<void> {
  await mockDelay();
  const facility = findOrThrow(id);
  if (facility.status !== 'pending') throw new Error('Invalid status transition');
  if (!facilityDocsAllApproved(facility.documents)) {
    throw new Error('All verification documents must be approved first');
  }
  facility.status = 'active';
  facility.adminNotes = undefined;
}

export async function rejectFacility(id: string, reason: string): Promise<void> {
  await mockDelay();
  if (reason.trim().length === 0) throw new Error('Reason is required');
  const facility = findOrThrow(id);
  if (facility.status !== 'pending') throw new Error('Invalid status transition');
  facility.status = 'rejected';
  facility.adminNotes = reason.trim();
}

export async function suspendFacility(id: string, reason: string): Promise<void> {
  await mockDelay();
  if (reason.trim().length === 0) throw new Error('Reason is required');
  const facility = findOrThrow(id);
  if (facility.status !== 'active' && facility.status !== 'owner_suspended') {
    throw new Error('Invalid status transition');
  }
  facility.status = 'suspended';
  facility.suspensionReason = reason.trim();
}

export async function reactivateFacility(id: string): Promise<void> {
  await mockDelay();
  const facility = findOrThrow(id);
  if (facility.status !== 'suspended') throw new Error('Invalid status transition');
  facility.status = 'active';
  facility.suspensionReason = undefined;
}

export async function reviewFacilityDocument(
  facilityId: string,
  documentId: string,
  action: FacilityDocAction,
  reason?: string,
): Promise<void> {
  await mockDelay();
  const facility = db.find((item) => item.id === facilityId);
  const document = facility?.documents.find((doc) => doc.id === documentId);
  if (!document) return;
  if (action === 'accept') {
    document.status = 'approved';
    document.rejectionReason = undefined;
  } else {
    document.status = 'rejected';
    document.rejectionReason = reason;
  }
}

const DEFAULT_SPECS: PitchSpecs = {
  surface: 'artificial',
  isIndoor: false,
  hasLighting: false,
  hasParking: false,
  hasLockerRoom: false,
  hasCafe: false,
};

/** Materialise input documents into stored documents, preserving prior status by URL. */
function buildDocuments(
  id: string,
  input: CreateFacilityInput,
  previous: FacilityDocument[] = [],
): FacilityDocument[] {
  const priorStatusByUrl = new Map(previous.map((doc) => [doc.url, doc.status]));
  return (input.documents ?? []).map((doc, index) => ({
    id: `${id}-d${index + 1}`,
    name: doc.name,
    status: priorStatusByUrl.get(doc.url) ?? 'pending',
    url: doc.url,
    kind: facilityDocumentKind(doc.url, undefined, doc.name),
  }));
}

/** Materialise an authored court, keeping its id on edit or minting one when new. */
function toCourt(input: CourtInput): Court {
  courtSeq += 1;
  return {
    id: input.id ?? `crt-${courtSeq}`,
    name: input.name,
    sport: input.sport,
    pricePerHour: input.pricePerHour,
    surface: input.surface,
    isIndoor: input.isIndoor,
    hasLighting: input.hasLighting,
    capacity: input.capacity,
    isActive: input.isActive,
  };
}

export async function createFacility(input: CreateFacilityInput): Promise<Facility> {
  await mockDelay();
  seq += 1;
  const id = `f${seq}`;
  let ownerName = '';
  try {
    ownerName = (await getOwnerById(input.ownerId)).name;
  } catch {
    ownerName = '';
  }
  const base = {
    id,
    name: input.name,
    status: 'pending' as FacilityStatus,
    location: { ...input.location },
    images: [...input.images],
    ownerId: input.ownerId,
    ownerName,
    source: 'admin' as FacilitySource,
    createdAt: new Date().toISOString(),
    documents: buildDocuments(id, input),
    statistics: zeroStats(),
  };

  if (input.kind === 'club') {
    const created: ClubFacility = {
      ...base,
      kind: 'club',
      description: input.description,
      sports: [...input.sports],
      workingHours: { ...(input.workingHours ?? {}) },
      contactPhone: input.contactPhone || undefined,
      courts: (input.courts ?? []).map(toCourt),
    };
    db.unshift(created);
    return created;
  }

  const created: PitchFacility = {
    ...base,
    kind: 'pitch',
    sport: input.sports[0] ?? 'football',
    pricePerHour: input.pricePerHour ?? 0,
    capacity: input.capacity,
    specs: input.specs ?? { ...DEFAULT_SPECS },
    cancelPolicy: input.cancelPolicy ?? { freeHoursBefore: 24, penaltyPercent: 0 },
  };
  db.unshift(created);
  return created;
}

/** Edit an existing facility in place, preserving status / createdAt / stats / rating. */
export async function updateFacility(id: string, input: UpdateFacilityInput): Promise<Facility> {
  await mockDelay();
  const index = db.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('Facility not found');
  const existing = db[index];

  let ownerName = existing.ownerName;
  if (input.ownerId !== existing.ownerId) {
    try {
      ownerName = (await getOwnerById(input.ownerId)).name;
    } catch {
      ownerName = existing.ownerName;
    }
  }

  const base = {
    id,
    name: input.name,
    status: existing.status,
    location: { ...input.location },
    images: [...input.images],
    ownerId: input.ownerId,
    ownerName,
    source: existing.source,
    createdAt: existing.createdAt,
    adminNotes: existing.adminNotes,
    suspensionReason: existing.suspensionReason,
    rating: existing.rating,
    documents: buildDocuments(id, input, existing.documents),
    statistics: existing.statistics,
  };

  let updated: Facility;
  if (input.kind === 'club') {
    updated = {
      ...base,
      kind: 'club',
      description: input.description,
      logoUrl: existing.kind === 'club' ? existing.logoUrl : undefined,
      sports: [...input.sports],
      workingHours: {
        ...(input.workingHours ?? (existing.kind === 'club' ? existing.workingHours : {})),
      },
      contactPhone: input.contactPhone || undefined,
      courts: (input.courts ?? (existing.kind === 'club' ? existing.courts : [])).map(toCourt),
    };
  } else {
    updated = {
      ...base,
      kind: 'pitch',
      sport: input.sports[0] ?? 'football',
      pricePerHour: input.pricePerHour ?? 0,
      capacity: input.capacity,
      specs: input.specs ?? (existing.kind === 'pitch' ? existing.specs : { ...DEFAULT_SPECS }),
      cancelPolicy:
        input.cancelPolicy ??
        (existing.kind === 'pitch' ? existing.cancelPolicy : { freeHoursBefore: 24, penaltyPercent: 0 }),
    };
  }
  db[index] = updated;
  return updated;
}

/** Approve or reject many pending submissions at once; non-pending ids are skipped. */
export async function bulkAction(
  ids: string[],
  action: BulkFacilityAction,
  reason?: string,
): Promise<BulkActionResult> {
  await mockDelay();
  if (action === 'reject' && (!reason || reason.trim().length === 0)) {
    throw new Error('Reason is required');
  }
  // Mirrors the real backend's skip reasons so the mock and live paths render
  // identically (see facilities-management.service.js bulkUpdateFacilityStatus).
  const skipped: BulkSkip[] = [];
  let succeeded = 0;
  for (const id of ids) {
    const facility = db.find((item) => item.id === id);
    if (!facility) {
      skipped.push({ id, reason: 'ERR_FACILITY_NOT_FOUND' });
      continue;
    }
    if (facility.status !== 'pending') {
      skipped.push({
        id,
        reason:
          (action === 'approve' && facility.status === 'active') ||
          (action === 'reject' && facility.status === 'rejected')
            ? 'ERR_ALREADY_IN_STATUS'
            : 'ERR_NOT_PENDING_REVIEW',
        status: facility.status,
      });
      continue;
    }
    if (action === 'approve' && !facilityDocsAllApproved(facility.documents)) {
      skipped.push({
        id,
        reason: facility.documents?.length
          ? 'ERR_DOCUMENTS_NOT_APPROVED'
          : 'ERR_NO_DOCUMENTS',
      });
      continue;
    }
    if (action === 'approve') {
      facility.status = 'active';
      facility.adminNotes = undefined;
    } else {
      facility.status = 'rejected';
      facility.adminNotes = reason?.trim();
    }
    succeeded += 1;
  }
  return { succeeded, skipped };
}

export async function getFacilityStats(): Promise<FacilityStats> {
  await mockDelay();
  const regions = await getScopeRegions();
  return computeFacilityStats([...db], regions, currentScope());
}

/**
 * Facility count per ACTIVE geo region for the region-management screen.
 *
 * Counts over ALL facilities in the db (unscoped — region management is a
 * super-admin surface): a facility belongs to a region when its coordinates
 * fall inside the circle (haversine distance ≤ radiusKm). Inactive regions are
 * skipped, so they report no key. Overlapping circles each count the facility.
 */
export async function getRegionFacilityCounts(): Promise<Record<string, number>> {
  await mockDelay();
  const regions = await getScopeRegions();
  const counts: Record<string, number> = {};
  for (const region of regions) {
    if (!region.isActive) continue;
    const center = { lat: region.centerLat, lng: region.centerLng };
    counts[region.id] = db.filter(
      (facility) =>
        haversineKm({ lat: facility.location.lat, lng: facility.location.lng }, center) <=
        region.radiusKm,
    ).length;
  }
  return counts;
}

/** Facility count per owner id (for the owners list facility-count column/filter). */
export async function getFacilityCountsByOwner(): Promise<Record<string, number>> {
  await mockDelay(200);
  const counts: Record<string, number> = {};
  for (const facility of db) {
    counts[facility.ownerId] = (counts[facility.ownerId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Disable every active facility owned by an owner — the owner block/suspend
 * cascade (FR-ADM-OWNER-006 / OW4). A real backend does this server-side.
 */
export async function suspendFacilitiesByOwner(ownerId: string): Promise<void> {
  await mockDelay(200);
  for (const facility of db) {
    if (facility.ownerId === ownerId && facility.status === 'active') {
      facility.status = 'suspended';
      facility.suspensionReason = 'Owner account suspended or blocked.';
    }
  }
}

/**
 * The facilities that fall inside a single region's geo circle (for the region
 * detail page). Runs over the FULL unscoped db — region detail is a super-admin
 * surface — keeping facilities whose coordinates are within the haversine radius.
 */
export async function getRegionFacilities(region: {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}): Promise<RegionFacility[]> {
  await mockDelay();
  const center = { lat: region.centerLat, lng: region.centerLng };
  return db
    .filter(
      (facility) =>
        haversineKm({ lat: facility.location.lat, lng: facility.location.lng }, center) <=
        region.radiusKm,
    )
    .map(toRegionFacility);
}

/**
 * Mock upload — keeps the object URL, which is correct HERE.
 *
 * Nothing is persisted in mock mode, so the blob lives exactly as long as the
 * page that made it. The real implementation posts to /facilities/media and
 * returns a durable URL instead.
 */
export async function uploadFacilityMedia(file: File): Promise<string> {
  await mockDelay();
  return URL.createObjectURL(file);
}

/** Mock delete — drops the row from the in-memory db. */
export async function deleteFacility(id: string): Promise<void> {
  await mockDelay();
  const index = db.findIndex((facility) => facility.id === id);
  if (index >= 0) db.splice(index, 1);
}
