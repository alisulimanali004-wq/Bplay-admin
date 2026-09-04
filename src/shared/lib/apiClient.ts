import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { useAuthStore } from '@shared/stores/authStore';
import { toAppError, type AppError } from './errors';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Per-request escape hatch: this call handles its own auth failure and must
     * NOT trip the global sign-out. Used by the change-password flow, where a
     * wrong current password is a 401 that belongs on the field rather than a
     * reason to end the session.
     */
    skipAuthHandling?: boolean;
  }
}

/** The single axios instance. Base URL comes from the environment, never hardcoded. */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  // Fail fast instead of hanging forever if the backend stalls (axios default is no timeout).
  timeout: 15_000,
});

/**
 * Never send `application/json` for a FormData body.
 *
 * The instance above declares a JSON Content-Type default, which axios applies
 * to EVERY request — including file uploads. The browser then never gets to
 * compute the `multipart/form-data; boundary=…` value, and the server's parser
 * rejects the body with "the request is not multipart".
 *
 * This bit two separate upload screens (owner KYC documents, facility media)
 * before being fixed at the source. Deleting the header here lets axios derive
 * the correct multipart Content-Type from the FormData itself, so a caller
 * cannot get it wrong by forgetting to override it.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Request: attach the Bearer token from the auth store (not a raw localStorage read).
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // A caller that set its own Authorization header wins. Sign-in does exactly
  // that: it must call GET /admin/me with the token it was just issued, while
  // the persisted store may still hold the PREVIOUS admin's — or a revoked —
  // session. Axios merges per-request headers before the interceptors run, so
  // without this guard the store's token silently overwrote the fresh one.
  if (config.headers.Authorization) return config;

  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Codes the admin context throws when the session itself is gone. They arrive as
 * 403, not 401, so status alone cannot distinguish "sign in again" from "you
 * lack this permission" — and without the code the app would strand the admin on
 * a dashboard where every request fails.
 */
const DEAD_SESSION_CODES = new Set([
  'ERR_SESSION_EXPIRED',
  'ERR_SESSION_REVOKED',
  'ERR_MALFORMED_TOKEN',
  'ERR_ADMIN_REVOKED',
  'ERR_ADMIN_DISABLED',
]);

function isDeadSession(error: AppError): boolean {
  if (error.status === 401) return true;
  return error.status === 403 && error.code !== undefined && DEAD_SESSION_CODES.has(error.code);
}

// Response: normalize every error to AppError; when the session is gone, drop it
// and bounce to login.
// NOTE(auth): admin sessions are absolute 24h with no refresh endpoint, so there
// is nothing to silently renew — re-authentication is the only recovery.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    const appError = toAppError(error);
    const config = (error as { config?: { skipAuthHandling?: boolean } }).config;

    if (!config?.skipAuthHandling && isDeadSession(appError)) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(appError);
  },
);
