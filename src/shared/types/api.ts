/**
 * Response-envelope helpers. The backend is inconsistent about how it wraps
 * payloads ({ data: { data } }, { data: { admins } }, { data }, or a raw value),
 * so every service unwraps through here instead of re-implementing the ladder.
 */
export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

/** Unwrap a single object from any of the known envelope shapes. */
export function unwrap<T>(payload: unknown): T {
  const obj = payload as Record<string, unknown> | null;
  if (obj && typeof obj === 'object' && 'data' in obj) {
    const inner = obj.data as Record<string, unknown> | null;
    if (inner && typeof inner === 'object' && 'data' in inner) {
      return inner.data as T;
    }
    return inner as T;
  }
  return payload as T;
}

/** Unwrap a list from any of the known envelope shapes. `keys` are extra list keys to try (e.g. "admins"). */
export function unwrapList<T>(payload: unknown, keys: string[] = []): T[] {
  const obj = (payload ?? {}) as Record<string, unknown>;
  const data = (obj.data ?? {}) as Record<string, unknown>;
  const candidates: unknown[] = [data.data, ...keys.map((k) => data[k]), obj.data, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Server pagination
// ---------------------------------------------------------------------------

/**
 * The `meta` block the backend's `paginated()` helper emits on every admin list
 * endpoint. Every field is optional because an endpoint that has not been
 * paginated yet simply omits it, and one that was miswired can emit a partial
 * one — `pageSize: undefined` was a real bug on three routes.
 */
export interface PageMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

/** The shape every list client in this dashboard returns. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Read `meta` off a response, falling back to the page's own length.
 *
 * WHY THIS EXISTS. Eleven list clients forwarded `page`/`pageSize` to the server
 * and then ran the returned page through `filterPaginate` a SECOND time. With
 * `page=2`, the server correctly returns rows 6–10, and the client then slices
 * that 5-element array from index 5 — producing an empty table. That is the
 * "facility page 2 is blank" bug, and it was latent in every one of them.
 *
 * The rule this encodes: whoever paginates, paginates ONCE. If the request went
 * to the server with paging params, the response is already the page — the
 * client must only read the totals.
 *
 * `fallbackPageSize` is used when the server omits `pageSize`; without it a
 * missing field would make `pageCount` collapse to 1 and hide later pages.
 */
export function readPageMeta<T>(
  payload: unknown,
  items: T[],
  requested: { page?: number; pageSize?: number } = {},
): PagedResult<T> {
  const meta = (payload as { meta?: PageMeta } | undefined)?.meta;
  const page = meta?.page ?? requested.page ?? 1;
  const pageSize = meta?.pageSize ?? requested.pageSize ?? items.length;
  const total = meta?.total ?? items.length;

  // Prefer the server's own totalPages; derive it only when absent, and never
  // report 0 pages for a non-empty result.
  const pageCount = meta?.totalPages
    ?? (pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1);

  return { items, total, page, pageCount };
}

/** Does this response carry server-side pagination at all? */
export function hasPageMeta(payload: unknown): boolean {
  const meta = (payload as { meta?: PageMeta } | undefined)?.meta;
  return typeof meta?.total === 'number';
}
