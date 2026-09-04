export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

export const DEFAULT_PAGE_SIZE = 10;

/** Client-side slice used by mock data sources (and as a fallback for un-paginated APIs). */
export function filterPaginate<T>(
  items: T[],
  opts: { page?: number; pageSize?: number } = {},
): Paginated<T> {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageCount };
}
