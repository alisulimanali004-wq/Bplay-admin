import { mockDelay } from '@shared/lib/mock';
import { generateStrongPassword } from '@shared/lib/password';
import { getFacilityCountsByOwner, suspendFacilitiesByOwner } from '@features/facility-management/api';
import { filterAndPaginateOwners } from './owner.filter';
import type {
  CreatedOwner,
  CreateOwnerInput,
  EditOwnerInput,
  Owner,
  OwnerAccountStatus,
  OwnerAction,
  OwnerDocAction,
  OwnerDocStatus,
  OwnerDocument,
  OwnerDocType,
  OwnerFacilityIntent,
  OwnerListParams,
  OwnerListResult,
  OwnerStats,
  OwnerTrustTier,
} from './owner.types';

/**
 * The seeds carry a 0–100 reputation score; the domain (and the backend) speak
 * in tiers. Derived here so the fixtures stay readable without re-introducing a
 * score the wire does not have.
 */
function scoreToTier(score: number): OwnerTrustTier {
  if (score >= 85) return 'premium';
  if (score >= 60) return 'verified';
  return 'basic';
}

// In-memory mutable db: mutations persist for the session and a refetch sees them.
// Ids align 1:1 with the facility mock's owner ids (300…) so an owner's detail
// page shows their real facilities and the facility-count column is accurate.
let seq = 400;

interface Seed {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  city: string;
  address: string;
  bio: string;
  link?: string;
  intent: OwnerFacilityIntent;
  region: string;
  accountStatus: OwnerAccountStatus;
  isBlocked: boolean;
  trustScore: number;
  revenue?: number;
  photo?: number;
  statusReason?: string;
  blockedReason?: string;
  withDocs: boolean;
}

const PDF = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';
const img = (seed: string): string => `https://picsum.photos/seed/${seed}/1000/700`;

/** Build a realistic per-owner document set whose statuses follow the account. */
function seedDocs(ownerId: string, accountStatus: OwnerAccountStatus): OwnerDocument[] {
  const spec: Array<{ type: OwnerDocType; kind: 'image' | 'pdf'; url: string }> = [
    { type: 'national_id', kind: 'image', url: img(`${ownerId}-id`) },
    { type: 'business_license', kind: 'pdf', url: PDF },
    { type: 'tax_certificate', kind: 'image', url: img(`${ownerId}-tax`) },
    { type: 'ownership_proof', kind: 'image', url: img(`${ownerId}-own`) },
  ];

  return spec.map((doc, index) => {
    let status: OwnerDocStatus;
    let rejectionReason: string | undefined;
    if (accountStatus === 'rejected') {
      // The business-license failed review; the rest were accepted.
      if (doc.type === 'business_license') {
        status = 'rejected';
        rejectionReason = 'The license document is expired. Please upload a valid, in-date copy.';
      } else {
        status = 'accepted';
      }
    } else if (accountStatus === 'under_review') {
      status = doc.type === 'national_id' ? 'accepted' : 'under_review';
    } else {
      status = 'accepted';
    }
    return {
      id: `${ownerId}-${index + 1}`,
      type: doc.type,
      status,
      rejectionReason,
      url: doc.url,
      kind: doc.kind,
      uploadedAt: new Date(2025, 0, 5).toISOString(),
    };
  });
}

const SEED: Seed[] = [
  { name: 'Fadi Barakat', legalName: 'Fadi Ahmad Barakat', email: 'fadi.barakat@bplay.app', phone: '933100201', nationalId: '11003001001', dateOfBirth: '1988-04-12', city: 'Damascus', address: 'Mezzeh, Damascus', bio: 'Running a padel venue in west Damascus.', link: 'https://padelwest.sy', intent: 'sports_club', region: 'Damascus', accountStatus: 'active', isBlocked: false, trustScore: 72, revenue: 3800000, photo: 11, withDocs: true },
  { name: 'Rana Suleiman', legalName: 'Rana Yusuf Suleiman', email: 'rana.suleiman@bplay.app', phone: '944220118', nationalId: '11003001002', dateOfBirth: '1990-09-03', city: 'Aleppo', address: 'Al-Furqan, Aleppo', bio: 'Opening my first independent court.', intent: 'independent_court', region: 'Aleppo', accountStatus: 'active', isBlocked: false, trustScore: 68, revenue: 3200000, photo: 45, withDocs: true },
  { name: 'Omar Khoury', legalName: 'Omar Nabil Khoury', email: 'omar.khoury@bplay.app', phone: '955330447', nationalId: '11003001003', dateOfBirth: '1985-01-22', city: 'Homs', address: 'Al-Waer, Homs', bio: 'Multi-court sports club owner.', intent: 'sports_club', region: 'Homs', accountStatus: 'active', isBlocked: false, trustScore: 78, revenue: 4200000, photo: 13, withDocs: true },
  { name: 'Lina Nasser', legalName: 'Lina Sami Nasser', email: 'lina.nasser@bplay.app', phone: '966440552', nationalId: '11003001004', dateOfBirth: '1992-11-30', city: 'Latakia', address: 'Al-Ziraa, Latakia', bio: 'Premium club with tennis and padel.', link: 'https://latakia-premium.sy', intent: 'sports_club', region: 'Latakia', accountStatus: 'active', isBlocked: false, trustScore: 92, revenue: 6850000, photo: 5, withDocs: true },
  { name: 'Karim Aziz', legalName: 'Karim Walid Aziz', email: 'karim.aziz@bplay.app', phone: '977550663', nationalId: '11003001005', dateOfBirth: '1987-06-18', city: 'Tartus', address: 'Al-Rawda, Tartus', bio: '', intent: 'independent_court', region: 'Tartus', accountStatus: 'active', isBlocked: false, trustScore: 64, revenue: 2900000, photo: 14, withDocs: true },
  { name: 'Maya Fares', legalName: 'Maya Elias Fares', email: 'maya.fares@bplay.app', phone: '988660774', nationalId: '11003001006', dateOfBirth: '1991-02-09', city: 'Damascus', address: 'Malki, Damascus', bio: 'Verified club owner.', intent: 'sports_club', region: 'Damascus', accountStatus: 'active', isBlocked: true, trustScore: 70, blockedReason: 'Repeated policy violations reported by players.', withDocs: true },
  { name: 'Ziad Halabi', legalName: 'Ziad Marwan Halabi', email: 'ziad.halabi@bplay.app', phone: '933770885', nationalId: '11003001007', dateOfBirth: '1983-12-01', city: 'Hama', address: 'Al-Hadher, Hama', bio: '', intent: 'independent_court', region: 'Hama', accountStatus: 'suspended', isBlocked: false, trustScore: 60, statusReason: 'Account paused pending updated tax documents.', photo: 33, withDocs: true },
  { name: 'Nour Kassem', legalName: 'Nour Adnan Kassem', email: 'nour.kassem@bplay.app', phone: '944880996', nationalId: '11003001008', dateOfBirth: '1994-07-25', city: 'Daraa', address: 'Al-Sabil, Daraa', bio: 'New applicant.', intent: 'independent_court', region: 'Daraa', accountStatus: 'under_review', isBlocked: false, trustScore: 40, withDocs: true },
  { name: 'Hadi Rahal', legalName: 'Hadi Ghassan Rahal', email: 'hadi.rahal@bplay.app', phone: '955990107', nationalId: '11003001009', dateOfBirth: '1986-03-14', city: 'Aleppo', address: 'Al-Mogambo, Aleppo', bio: 'Verified sports club.', intent: 'sports_club', region: 'Aleppo', accountStatus: 'active', isBlocked: false, trustScore: 85, revenue: 5100000, photo: 52, withDocs: true },
  { name: 'Dina Saab', legalName: 'Dina Fouad Saab', email: 'dina.saab@bplay.app', phone: '966101218', nationalId: '11003001010', dateOfBirth: '1989-10-05', city: 'Damascus', address: 'Abu Rummaneh, Damascus', bio: 'Top-rated premium owner.', link: 'https://damascus-elite.sy', intent: 'sports_club', region: 'Damascus', accountStatus: 'active', isBlocked: false, trustScore: 96, revenue: 7400000, photo: 9, withDocs: false },
  { name: 'Tarek Mansour', legalName: 'Tarek Bassam Mansour', email: 'tarek.mansour@bplay.app', phone: '977212329', nationalId: '11003001011', dateOfBirth: '1993-05-19', city: 'Homs', address: 'Karm al-Zaytoun, Homs', bio: '', intent: 'independent_court', region: 'Homs', accountStatus: 'active', isBlocked: false, trustScore: 66, revenue: 3500000, photo: 15, withDocs: true },
  { name: 'Yasmin Deeb', legalName: 'Yasmin Rami Deeb', email: 'yasmin.deeb@bplay.app', phone: '988323430', nationalId: '11003001012', dateOfBirth: '1990-08-08', city: 'Latakia', address: 'Al-Sheikh Daher, Latakia', bio: 'Verified owner.', intent: 'sports_club', region: 'Latakia', accountStatus: 'active', isBlocked: false, trustScore: 88, revenue: 4650000, photo: 47, withDocs: false },
  { name: 'Samer Wehbe', legalName: 'Samer Jamal Wehbe', email: 'samer.wehbe@bplay.app', phone: '933434541', nationalId: '11003001013', dateOfBirth: '1984-01-27', city: 'Idlib', address: 'Al-Qusour, Idlib', bio: '', intent: 'independent_court', region: 'Idlib', accountStatus: 'active', isBlocked: false, trustScore: 58, revenue: 2100000, photo: 60, withDocs: true },
  { name: 'Sara Haddad', legalName: 'Sara Kamal Haddad', email: 'sara.haddad@bplay.app', phone: '944545652', nationalId: '11003001014', dateOfBirth: '1995-12-11', city: 'Tartus', address: 'Al-Thawra, Tartus', bio: '', intent: 'sports_club', region: 'Tartus', accountStatus: 'rejected', isBlocked: false, trustScore: 35, statusReason: 'National ID did not match the applicant; verification failed.', withDocs: true },
  { name: 'Bassel Aouad', legalName: 'Bassel Nadim Aouad', email: 'bassel.aouad@bplay.app', phone: '955221144', nationalId: '11003001015', dateOfBirth: '1990-06-20', city: 'Damascus', address: 'Qassaa, Damascus', bio: 'Applying to open a padel club.', intent: 'sports_club', region: 'Damascus', accountStatus: 'under_review', isBlocked: false, trustScore: 50, withDocs: true },
  { name: 'Rima Khaddour', legalName: 'Rima Sami Khaddour', email: 'rima.khaddour@bplay.app', phone: '966332255', nationalId: '11003001016', dateOfBirth: '1993-03-11', city: 'Aleppo', address: 'Al-Furqan, Aleppo', bio: 'New independent-court applicant.', intent: 'independent_court', region: 'Aleppo', accountStatus: 'under_review', isBlocked: false, trustScore: 47, withDocs: true },
];

const db: Owner[] = SEED.map((seed, index) => {
  const id = String(300 + index);
  return {
    id,
    name: seed.name,
    legalName: seed.legalName,
    email: seed.email,
    phone: `963${seed.phone}`,
    nationalId: seed.nationalId,
    dateOfBirth: seed.dateOfBirth,
    photoUrl: seed.photo ? `https://i.pravatar.cc/512?img=${seed.photo}` : undefined,
    city: seed.city,
    address: seed.address,
    bio: seed.bio || undefined,
    link: seed.link,
    intendedFacilityType: seed.intent,
    region: seed.region,
    accountStatus: seed.accountStatus,
    statusReason: seed.statusReason,
    isBlocked: seed.isBlocked,
    blockedReason: seed.blockedReason,
    trustTier: scoreToTier(seed.trustScore),
    monthlyRevenueSyp: seed.revenue,
    documents: seed.withDocs ? seedDocs(id, seed.accountStatus) : [],
    // The mock always serves the full record, so the approve gate is decidable.
    documentsLoaded: true,
    // Spread joins over recent months so the "Joined" recency filter is meaningful.
    createdAt: new Date(Date.now() - index * 12 * 86_400_000).toISOString(),
  };
});

function applyAction(owner: Owner, action: OwnerAction, reason?: string): void {
  switch (action) {
    case 'approve':
      owner.accountStatus = 'active';
      owner.statusReason = undefined;
      break;
    case 'reject':
      owner.accountStatus = 'rejected';
      owner.statusReason = reason;
      break;
    case 'suspend':
      owner.accountStatus = 'suspended';
      owner.statusReason = reason;
      break;
    case 'activate':
      owner.accountStatus = 'active';
      owner.statusReason = undefined;
      break;
    case 'block':
      owner.isBlocked = true;
      owner.blockedReason = reason;
      break;
    case 'unblock':
      owner.isBlocked = false;
      owner.blockedReason = undefined;
      break;
  }
}

async function withFacilityCount(owner: Owner): Promise<Owner> {
  const counts = await getFacilityCountsByOwner();
  return { ...owner, facilitiesCount: counts[owner.id] ?? 0 };
}

export async function getOwners(params: OwnerListParams): Promise<OwnerListResult> {
  const counts = await getFacilityCountsByOwner();
  const hydrated = db.map((owner) => ({ ...owner, facilitiesCount: counts[owner.id] ?? 0 }));
  return filterAndPaginateOwners(hydrated, params);
}

export async function getOwnerById(id: string): Promise<Owner> {
  await mockDelay();
  const owner = db.find((item) => item.id === id);
  if (!owner) throw new Error('Owner not found');
  const hydrated = await withFacilityCount(owner);
  return { ...hydrated, documents: owner.documents.map((doc) => ({ ...doc })) };
}

export async function getOwnerStats(): Promise<OwnerStats> {
  await mockDelay(200);
  // Mutually exclusive buckets, exactly like the backend: blocked beats
  // suspended, which beats the review outcome — so the parts sum to the total.
  const live = db.filter((o) => !o.isBlocked && o.accountStatus !== 'suspended');
  return {
    total: db.length,
    underReview: live.filter((o) => o.accountStatus === 'under_review').length,
    active: live.filter((o) => o.accountStatus === 'active').length,
    rejected: live.filter((o) => o.accountStatus === 'rejected').length,
    suspended: db.filter((o) => !o.isBlocked && o.accountStatus === 'suspended').length,
    blocked: db.filter((o) => o.isBlocked).length,
  };
}

export async function updateOwnerStatus(
  id: string,
  action: OwnerAction,
  reason?: string,
): Promise<void> {
  await mockDelay();
  const owner = db.find((item) => item.id === id);
  if (!owner) return;
  applyAction(owner, action, reason);
  // Deactivating or banning an owner cascades to disable all their facilities
  // (FR-ADM-OWNER-006 / OW4). A real backend does this server-side.
  if (action === 'block' || action === 'suspend') {
    await suspendFacilitiesByOwner(id);
  }
}

export async function reviewOwnerDocument(
  id: string,
  documentId: string,
  action: OwnerDocAction,
  reason?: string,
): Promise<void> {
  await mockDelay();
  const owner = db.find((item) => item.id === id);
  const document = owner?.documents.find((doc) => doc.id === documentId);
  if (!document) return;
  if (action === 'accept') {
    document.status = 'accepted';
    document.rejectionReason = undefined;
  } else {
    document.status = 'rejected';
    document.rejectionReason = reason;
  }
}

/**
 * Upload a document on the owner's behalf. Lands as `pending` so the review
 * flow behaves the same as it does against the real backend.
 *
 * `URL.createObjectURL` gives the mock a genuinely viewable link for the file
 * the admin just picked, so the preview affordance works offline too.
 */
export async function uploadOwnerDocument(
  id: string,
  docType: OwnerDocType,
  file: File,
): Promise<void> {
  await mockDelay();
  const owner = db.find((item) => item.id === id);
  if (!owner) return;
  owner.documents.push({
    id: `doc-${id}-${owner.documents.length + 1}`,
    type: docType,
    // The wire's `pending` is `under_review` in the dashboard's vocabulary —
    // this mirrors what `normalizeDocStatus` does to a real response.
    status: 'under_review',
    // Drives which icon and which viewer the card uses.
    kind: file.type.startsWith('image/') ? 'image' : 'pdf',
    url: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
  });
}

export async function createOwner(input: CreateOwnerInput): Promise<CreatedOwner> {
  await mockDelay();
  const tempPassword = generateStrongPassword();
  const owner: Owner = {
    id: String((seq += 1)),
    name: input.name,
    email: input.email,
    phone: `963${input.phone}`,
    nationalId: input.nationalId,
    address: input.address,
    region: '',
    accountStatus: 'under_review',
    isBlocked: false,
    trustTier: 'basic',
    documents: [],
    documentsLoaded: true,
    facilitiesCount: 0,
    createdAt: new Date().toISOString(),
  };
  db.unshift(owner);
  return { owner, tempPassword };
}

/** Mock profile edit — name and address only, mirroring the real endpoint. */
export async function updateOwner(id: string, input: EditOwnerInput): Promise<void> {
  await mockDelay();
  const owner = db.find((entry) => entry.id === id);
  if (!owner) throw new Error('Owner not found');
  owner.name = input.name.trim();
  owner.address = input.address?.trim() || undefined;
}
