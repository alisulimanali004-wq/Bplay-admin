import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './admin.api';
import * as mock from './admin.api.mock';

const impl = USE_MOCKS ? mock : real;

export const getAdmins = impl.getAdmins;
export const getAdminById = impl.getAdminById;
export const getAdminStats = impl.getAdminStats;
export const createAdmin = impl.createAdmin;
export const updateAdmin = impl.updateAdmin;
export const toggleAdminActive = impl.toggleAdminActive;
export const setAdminScope = impl.setAdminScope;
export const assignRegions = impl.assignRegions;
export const resetAdminPassword = impl.resetAdminPassword;
export const deleteAdmin = impl.deleteAdmin;
