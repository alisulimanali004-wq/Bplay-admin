import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './dashboard.api';
import * as mock from './dashboard.api.mock';

const impl = USE_MOCKS ? mock : real;

export const getDashboard = impl.getDashboard;
export const getDashboardRegions = impl.getDashboardRegions;
