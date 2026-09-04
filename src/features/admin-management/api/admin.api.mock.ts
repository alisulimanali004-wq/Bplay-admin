import { mockDelay } from '@shared/lib/mock';
import { getScopeRegions, assignAdmins } from '@features/region-management/api';
import { filterAndPaginateAdmins } from './admin.filter';
import type {
  Admin,
  AdminListParams,
  AdminListResult,
  AdminScope,
  AdminStats,
  CreateAdminInput,
  UpdateAdminInput,
} from './admin.types';

// In-memory mutable db: mutations persist for the session and a refetch sees them.
// New ids are seq-based; the seeded ids 100..114 keep the id/name pairs that
// region.api.mock.ts SEEDS reference (100 Sara -> Damascus c1, 101 Omar -> Aleppo
// c2, 102 Lina -> Latakia c4). The admin<->region link lives ON THE REGION; each
// admin's assignedRegion* is DERIVED (hydrated) from the region db on every read.
let seq = 200;

/** The stored record: an Admin plus the mock-only original password. */
interface AdminRecord extends Admin {
  /** The initial password we issued — restored (and revealed once) on reset. */
  initialPassword: string;
}

interface AdminSeed {
  name: string;
  email: string;
  isActive: boolean;
  scope: AdminScope;
  nationalId: string;
  /** 9-digit local part; stored canonical as 963 + local. */
  phoneLocal: string;
  /** i.pravatar image id, or undefined for an initials fallback. */
  photo?: number;
  isDeleted?: boolean;
}

const SEEDS: AdminSeed[] = [
  { name: 'Sara Haddad', email: 'sara.haddad@bplay.app', isActive: true, scope: 'regional', nationalId: '11002003001', phoneLocal: '988324051', photo: 12 },
  { name: 'Omar Khoury', email: 'omar.khoury@bplay.app', isActive: true, scope: 'regional', nationalId: '11002003002', phoneLocal: '955114477', photo: 13 },
  { name: 'Lina Nasser', email: 'lina.nasser@bplay.app', isActive: true, scope: 'regional', nationalId: '11002003003', phoneLocal: '944225588', photo: 5 },
  { name: 'Karim Aziz', email: 'karim.aziz@bplay.app', isActive: false, scope: 'regional', nationalId: '11002003004', phoneLocal: '933667788' },
  { name: 'Rana Suleiman', email: 'rana.suleiman@bplay.app', isActive: true, scope: 'general', nationalId: '11002003005', phoneLocal: '966554433', photo: 32 },
  { name: 'Tarek Mansour', email: 'tarek.mansour@bplay.app', isActive: true, scope: 'general', nationalId: '11002003006', phoneLocal: '911223344', photo: 15 },
  { name: 'Maya Fares', email: 'maya.fares@bplay.app', isActive: false, scope: 'regional', nationalId: '11002003007', phoneLocal: '977889900' },
  { name: 'Ziad Halabi', email: 'ziad.halabi@bplay.app', isActive: true, scope: 'regional', nationalId: '11002003008', phoneLocal: '900112233' },
  { name: 'Nour Kassem', email: 'nour.kassem@bplay.app', isActive: true, scope: 'general', nationalId: '11002003009', phoneLocal: '988776655', photo: 45 },
  { name: 'Hadi Rahal', email: 'hadi.rahal@bplay.app', isActive: true, scope: 'regional', nationalId: '11002003010', phoneLocal: '944556677' },
  { name: 'Dina Saab', email: 'dina.saab@bplay.app', isActive: false, scope: 'general', nationalId: '11002003011', phoneLocal: '955998877' },
  { name: 'Fadi Barakat', email: 'fadi.barakat@bplay.app', isActive: true, scope: 'regional', nationalId: '11002003012', phoneLocal: '933221100' },
  { name: 'Yasmin Deeb', email: 'yasmin.deeb@bplay.app', isActive: true, scope: 'general', nationalId: '11002003013', phoneLocal: '911778899', photo: 47 },
  { name: 'Samer Wehbe', email: 'samer.wehbe@bplay.app', isActive: true, scope: 'regional', nationalId: '11002003014', phoneLocal: '900998877' },
  { name: 'Bassel Aouad', email: 'bassel.aouad@bplay.app', isActive: false, scope: 'regional', nationalId: '11002003015', phoneLocal: '966112299', isDeleted: true },
];

const db: AdminRecord[] = SEEDS.map<AdminRecord>((seed, index) => ({
  id: String(100 + index),
  name: seed.name,
  email: seed.email,
  role: 'admin',
  isActive: seed.isActive,
  status: seed.isActive ? 'active' : 'suspended',
  scope: seed.scope,
  phone: `963${seed.phoneLocal}`,
  nationalId: seed.nationalId,
  photoUrl: seed.photo ? `https://i.pravatar.cc/512?img=${seed.photo}` : undefined,
  isDeleted: seed.isDeleted ?? false,
  assignedRegionIds: [],
  assignedRegionNames: [],
  includedNeighbourhoodIds: [],
  includedNeighbourhoodNames: [],
  excludedNeighbourhoodIds: [],
  excludedNeighbourhoodNames: [],
  initialPassword: `Bplay@${100 + index}`,
  createdAt: new Date(2025, 0, index + 1).toISOString(),
}));

/** Strip the mock-only initialPassword and attach the derived regions for an admin. */
function toPublicAdmin(
  record: AdminRecord,
  regions: Array<{ id: string; name: string; assignedAdminIds: string[] }>,
): Admin {
  const mine = regions.filter((region) => region.assignedAdminIds.includes(record.id));
  const { initialPassword: _initialPassword, ...admin } = record;
  return {
    ...admin,
    assignedRegionIds: mine.map((region) => region.id),
    assignedRegionNames: mine.map((region) => region.name),
  };
}

/**
 * Write the admin<->region link THROUGH to the region db: add the admin to every
 * target region and remove them from any live region no longer targeted, without
 * disturbing the OTHER admins assigned there. Only touched regions are written.
 */
async function writeThroughRegions(
  adminId: string,
  adminName: string,
  targetRegionIds: string[],
): Promise<void> {
  const regions = await getScopeRegions();
  for (const region of regions) {
    const has = region.assignedAdminIds.includes(adminId);
    const should = targetRegionIds.includes(region.id);
    if (has === should) continue;
    const pairs = region.assignedAdminIds
      .map((id, i) => ({ id, name: region.assignedAdminNames[i] ?? '' }))
      .filter((pair) => pair.id !== adminId);
    if (should) pairs.push({ id: adminId, name: adminName });
    await assignAdmins(
      region.id,
      pairs.map((pair) => pair.id),
      pairs.map((pair) => pair.name),
    );
  }
}

export async function getAdmins(params: AdminListParams): Promise<AdminListResult> {
  const regions = await getScopeRegions();
  const hydrated = db.map((record) => toPublicAdmin(record, regions));
  return filterAndPaginateAdmins(hydrated, params);
}

/** Platform-wide admin counts for the list KPI row (live admins, regions hydrated). */
export async function getAdminStats(): Promise<AdminStats> {
  const regions = await getScopeRegions();
  const live = db
    .filter((record) => !record.isDeleted)
    .map((record) => toPublicAdmin(record, regions));
  return {
    total: live.length,
    active: live.filter((admin) => admin.status === 'active').length,
    regional: live.filter((admin) => admin.scope === 'regional').length,
    unassigned: live.filter(
      (admin) => admin.scope === 'regional' && admin.assignedRegionIds.length === 0,
    ).length,
  };
}

/** Fetch a single admin by id INCLUDING soft-deleted ones (the detail page still shows it). */
export async function getAdminById(id: string): Promise<Admin> {
  const regions = await getScopeRegions();
  const record = db.find((item) => item.id === id);
  if (!record) throw new Error('Admin not found');
  return toPublicAdmin(record, regions);
}

export async function createAdmin(input: CreateAdminInput): Promise<Admin> {
  await mockDelay();
  const record: AdminRecord = {
    id: String((seq += 1)),
    name: input.name,
    email: input.email,
    role: 'admin',
    isActive: true,
    status: 'active',
    scope: input.scope,
    phone: `963${input.phone}`,
    nationalId: input.nationalId,
    photoUrl: undefined,
    isDeleted: false,
    assignedRegionIds: [],
    assignedRegionNames: [],
    // The mock has no neighbourhood level; scoping there is real-API only.
    includedNeighbourhoodIds: [],
    includedNeighbourhoodNames: [],
    excludedNeighbourhoodIds: [],
    excludedNeighbourhoodNames: [],
    initialPassword: input.password,
    createdAt: new Date().toISOString(),
  };
  db.unshift(record);
  if (input.scope === 'regional') {
    await writeThroughRegions(record.id, record.name, input.regionIds);
  }
  return getAdminById(record.id);
}

export async function updateAdmin(id: string, input: UpdateAdminInput): Promise<Admin> {
  await mockDelay();
  const record = db.find((item) => item.id === id);
  if (!record) throw new Error('Admin not found');
  record.name = input.name;
  record.email = input.email;
  record.phone = `963${input.phone}`;
  record.nationalId = input.nationalId;
  record.scope = input.scope;
  // A general admin holds no regions; a regional admin's set follows the form.
  await writeThroughRegions(id, record.name, input.scope === 'regional' ? input.regionIds : []);
  return getAdminById(id);
}

export async function toggleAdminActive(id: string, isActive: boolean): Promise<void> {
  await mockDelay();
  const record = db.find((item) => item.id === id);
  if (record) {
    record.isActive = isActive;
    record.status = isActive ? 'active' : 'suspended';
  }
}

/** Promote/demote the oversight tier. Promoting to general clears the region links. */
export async function setAdminScope(id: string, scope: AdminScope): Promise<void> {
  await mockDelay();
  const record = db.find((item) => item.id === id);
  if (!record) return;
  record.scope = scope;
  if (scope === 'general') {
    await writeThroughRegions(id, record.name, []);
  }
}

/** Replace the whole region set for an admin (many-to-many, write-through to regions). */
export async function assignRegions(id: string, regionIds: string[]): Promise<void> {
  await mockDelay();
  const record = db.find((item) => item.id === id);
  if (!record) return;
  await writeThroughRegions(id, record.name, regionIds);
}

/**
 * Set the password to an explicit value, mirroring the real endpoint (which
 * requires one and never echoes a password back).
 */
export async function resetAdminPassword(id: string, password: string): Promise<string> {
  await mockDelay();
  const record = db.find((item) => item.id === id);
  if (!record) throw new Error('Admin not found');
  record.initialPassword = password;
  return '';
}

/**
 * Soft delete — the admin is hidden from the default list but kept for restore.
 * A deleted admin manages nothing, so clear them from every region (write-through)
 * to avoid a phantom (deleted) admin lingering on the region side.
 */
export async function deleteAdmin(id: string): Promise<void> {
  await mockDelay();
  const record = db.find((item) => item.id === id);
  if (!record) return;
  record.isDeleted = true;
  await writeThroughRegions(id, record.name, []);
}

/** Restore a soft-deleted admin back into the live list. */
export async function restoreAdmin(id: string): Promise<void> {
  await mockDelay();
  const record = db.find((item) => item.id === id);
  if (record) record.isDeleted = false;
}
