import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './auth.api';
import * as mock from './auth.api.mock';

// The one swap point: components/hooks import from here and never change on go-live.
const impl = USE_MOCKS ? mock : real;

export const login = impl.login;
export const logout = impl.logout;
export const getMe = impl.getMe;
export const forgotPassword = impl.forgotPassword;
export const resetPassword = impl.resetPassword;
