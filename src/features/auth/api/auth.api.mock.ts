import { mockDelay } from '@shared/lib/mock';
import type {
  AdminMe,
  AuthSession,
  ForgotInput,
  LoginInput,
  ResetInput,
  UserRole,
} from './auth.types';

/** Demo regional/oversight accounts — matched case-insensitively before the default branch. */
interface DemoAccount {
  email: string;
  role: UserRole;
  name: string;
  assignedRegionIds: string[];
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'regional@bplay.app', role: 'admin', name: 'Regional Admin — Damascus', assignedRegionIds: ['c1'] },
  { email: 'regional.aleppo@bplay.app', role: 'admin', name: 'Regional Admin — Aleppo', assignedRegionIds: ['c2'] },
  { email: 'oversight@bplay.app', role: 'admin', name: 'General Oversight Admin', assignedRegionIds: [] },
];

/** The permission slugs the real backend seeds — mirrored so gated UI behaves the same on mocks. */
const ALL_PERMISSIONS = [
  'approve-venues', 'create-admins', 'create-owners', 'create-permissions', 'create-players',
  'create-regions', 'create-roles', 'delete-admins', 'delete-permissions', 'delete-regions',
  'delete-roles', 'edit-admins', 'edit-permissions', 'edit-players', 'edit-regions', 'edit-roles',
  'edit-users', 'manage-platform-plans', 'manage-platform-subscriptions', 'reject-venues',
  'update-owners', 'view-admins', 'view-owners', 'view-permissions', 'view-platform-plans',
  'view-platform-subscriptions', 'view-players', 'view-regions', 'view-roles', 'view-users',
  'view-venues',
];

/** A regional admin reviews but does not create or delete. */
const REGIONAL_PERMISSIONS = [
  'view-owners', 'update-owners', 'view-players', 'edit-players', 'view-venues',
  'approve-venues', 'reject-venues', 'view-regions',
];

const permissionsFor = (role: UserRole) =>
  role === 'super_admin' ? ALL_PERMISSIONS : REGIONAL_PERMISSIONS;

const scopeFor = (role: UserRole, regionIds: string[]) => ({
  all: role === 'super_admin',
  cities: regionIds.map((id) => ({ id, name: id })),
  neighbourhoods: [],
});

/** Mock implementation — demo accounts sign in as admins; anything else is a super admin. */
export async function login(input: LoginInput): Promise<AuthSession> {
  await mockDelay();
  const email = input.email.trim().toLowerCase();
  const demo = DEMO_ACCOUNTS.find((account) => account.email === email);

  if (demo) {
    return {
      accessToken: 'mock.access.token',
      role: demo.role,
      permissions: permissionsFor(demo.role),
      user: {
        email: demo.email,
        name: demo.name,
        role: demo.role,
        assignedRegionIds: demo.assignedRegionIds,
        scope: scopeFor(demo.role, demo.assignedRegionIds),
      },
    };
  }

  const role: UserRole = 'super_admin';
  return {
    accessToken: 'mock.access.token',
    role,
    permissions: permissionsFor(role),
    user: {
      email: input.email,
      name: 'Super Admin',
      role,
      assignedRegionIds: [],
      scope: scopeFor(role, []),
    },
  };
}

export async function getMe(fallback: { email: string; role: UserRole }): Promise<AdminMe> {
  await mockDelay(150);
  const demo = DEMO_ACCOUNTS.find((account) => account.email === fallback.email.toLowerCase());
  const role = demo?.role ?? fallback.role;
  const regionIds = demo?.assignedRegionIds ?? [];

  return {
    id: 'mock-admin',
    email: fallback.email,
    name: demo?.name ?? 'Super Admin',
    role,
    permissions: permissionsFor(role),
    scope: scopeFor(role, regionIds),
  };
}

export async function logout(): Promise<void> {
  await mockDelay(200);
}

export async function forgotPassword(_input: ForgotInput): Promise<void> {
  await mockDelay();
}

export async function resetPassword(_input: ResetInput): Promise<void> {
  await mockDelay();
}
