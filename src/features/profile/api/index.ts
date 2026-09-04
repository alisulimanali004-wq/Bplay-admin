import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './profile.api';
import * as mock from './profile.api.mock';

const impl = USE_MOCKS ? mock : real;

export const updateProfile = impl.updateProfile;
export const changePassword = impl.changePassword;
