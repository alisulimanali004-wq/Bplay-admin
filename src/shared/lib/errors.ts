/**
 * The single place backend/network errors become a typed AppError. Kills the
 * `err?.response?.data?.message || 'fallback'` pattern duplicated across the app.
 */
export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly fieldErrors?: FieldErrors;

  constructor(
    message: string,
    opts: { status?: number; code?: string; fieldErrors?: FieldErrors } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = opts.status;
    this.code = opts.code;
    this.fieldErrors = opts.fieldErrors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * True when an error represents a "not found" outcome — a real 404 (AppError.status)
 * or the mock sources' `Error('X not found')` convention. Detail pages use this to
 * render their own not-found EmptyState; the query client uses it to skip retries
 * and the global error toast for these expected outcomes.
 */
export function isNotFoundError(error: unknown): boolean {
  if (isAppError(error)) return error.status === 404;
  if (error instanceof Error) return /\bnot found\.?$/i.test(error.message.trim());
  return false;
}

/** The bplay-backend envelope: `{ success: false, error: { code, message, details } }`. */
interface BackendErrorBody {
  message?: string;
  /** Object on bplay-backend; a plain string on some generic middlewares. */
  error?: string | { code?: string; message?: string; details?: unknown };
  code?: string;
  errors?: unknown;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  const err = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
    code?: string;
  };
  const response = err?.response;
  const data = (response?.data ?? {}) as BackendErrorBody;

  // bplay-backend nests everything under `error`. Reading `data.error` as a
  // string used to stringify that object into "[object Object]" and lose the
  // ERR_* code entirely — every backend failure then looked identical.
  const envelope = typeof data.error === 'object' && data.error !== null ? data.error : undefined;
  const legacyError = typeof data.error === 'string' ? data.error : undefined;

  const message =
    envelope?.message ||
    data.message ||
    legacyError ||
    err?.message ||
    'Something went wrong. Please try again.';

  return new AppError(message, {
    status: response?.status,
    code: envelope?.code ?? data.code ?? err?.code,
    fieldErrors: extractFieldErrors(data.errors ?? envelope?.details),
  });
}

/** Ajv/Fastify validation entry — `instancePath` is the offending field, e.g. "/email". */
interface AjvErrorEntry {
  instancePath?: string;
  params?: { missingProperty?: string };
  message?: string;
}

function extractFieldErrors(errors: unknown): FieldErrors | undefined {
  if (!errors) return undefined;

  // ERR_VALIDATION carries Fastify's ajv array, not a field->message map.
  if (Array.isArray(errors)) {
    const out: FieldErrors = {};
    for (const entry of errors as AjvErrorEntry[]) {
      const field =
        entry?.params?.missingProperty ?? (entry?.instancePath ?? '').replace(/^\//, '');
      if (field && entry?.message && !out[field]) out[field] = entry.message;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  if (typeof errors !== 'object') return undefined;
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') out[key] = value[0];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Backend error code → i18n key. Only codes with a genuinely better wording than
 * the server's English message are listed; anything else falls back to
 * `AppError.message`, so a new backend code degrades gracefully instead of
 * rendering a missing-translation key.
 */
const ERROR_CODE_KEYS: Record<string, string> = {
  // Admin sign-in (super-admin/auth.service.js)
  ERR_ADMIN_AUTH_FAILED: 'auth.errors.invalidCredentials',
  ERR_ADMIN_LOCKED: 'auth.errors.accountLocked',
  ERR_ADMIN_LOCKOUT: 'auth.errors.accountLockedNow',
  ERR_ADMIN_DISABLED: 'auth.errors.accountDisabled',
  ERR_ADMIN_REVOKED: 'auth.errors.accessRevoked',
  ERR_DOMAIN_FORBIDDEN: 'auth.errors.domainForbidden',
  ERR_IP_FORBIDDEN: 'auth.errors.ipForbidden',
  // Session
  ERR_SESSION_EXPIRED: 'auth.errors.sessionExpired',
  ERR_SESSION_REVOKED: 'auth.errors.sessionRevoked',
  ERR_MALFORMED_TOKEN: 'auth.errors.sessionInvalid',
  // Password change / reset (modules/auth)
  ERR_WRONG_PASSWORD: 'profile.errors.wrongCurrent',
  ERR_PASSWORD_UNCHANGED: 'profile.errors.samePassword',
  ERR_PASSWORD_MISMATCH: 'auth.errors.passwordMismatch',
  ERR_INVALID_TOKEN: 'auth.errors.resetLinkInvalid',
  ERR_TOKEN_EXPIRED: 'auth.errors.resetLinkInvalid',
  // Owner lifecycle (super-admin/owners-management)
  ERR_NO_DOCUMENTS: 'owner.errors.noDocuments',
  ERR_INCOMPLETE_DOCS: 'owner.errors.incompleteDocs',
  ERR_ILLEGAL_TRANSITION: 'owner.errors.illegalTransition',
  ERR_REASON_REQUIRED: 'owner.errors.reasonRequired',
  ERR_OWNER_NOT_FOUND: 'owner.errors.notFound',
  ERR_DUPLICATE_EMAIL: 'owner.errors.duplicateEmail',
  ERR_DUPLICATE_PHONE: 'owner.errors.duplicatePhone',
  ERR_DUPLICATE_NATIONAL_ID: 'owner.errors.duplicateNationalId',
  ERR_FIELD_NOT_EDITABLE: 'owner.errors.fieldNotEditable',
  ERR_NO_FIELDS: 'owner.errors.noFields',
  // Facility lifecycle (super-admin/facilities-management)
  ERR_FACILITY_NOT_FOUND: 'facility.errors.notFound',
  ERR_FACILITY_HAS_BOOKINGS: 'facility.errors.hasBookings',
  ERR_UNSUPPORTED_FILE_TYPE: 'facility.errors.unsupportedFileType',
  ERR_FILE_TOO_LARGE: 'facility.errors.fileTooLarge',
  // Authorization
  ERR_PERMISSION_DENIED: 'common.errors.permissionDenied',
};

/**
 * The i18n key for an error, or undefined when there is no better wording than
 * the server's own message. Status-only fallbacks cover the cases the backend
 * cannot label (a rate limiter's 429, a dropped connection).
 */
export function errorMessageKey(error: unknown): string | undefined {
  const appError = isAppError(error) ? error : undefined;
  if (!appError) return undefined;
  if (appError.code && ERROR_CODE_KEYS[appError.code]) return ERROR_CODE_KEYS[appError.code];
  if (appError.status === 429) return 'common.errors.tooManyRequests';
  if (appError.status === 403) return 'common.errors.permissionDenied';
  if (appError.status === undefined) return 'common.errors.network';
  return undefined;
}
