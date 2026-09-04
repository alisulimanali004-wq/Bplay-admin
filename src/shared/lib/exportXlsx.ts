/**
 * Generic client-side Excel export.
 *
 * The one shared abstraction the oversight lists (bookings, club subscriptions)
 * need: turn already-filtered, already-scoped rows into a downloadable `.xlsx`.
 * SheetJS is pulled in via a dynamic `import()` so it stays out of the main
 * bundle (consistent with the app's route-level `lazy()` discipline) — the
 * spreadsheet writer only loads the first time an admin actually exports.
 *
 * Write-only: we call `json_to_sheet` / `writeFile`, never `read`/`readFile` on
 * untrusted input, so the parser-side advisories in the `xlsx` package never
 * apply here.
 */

/** A single spreadsheet column: a localized header + a plain cell extractor. */
export interface XlsxColumn<T> {
  header: string;
  /** xlsx cells are plain strings/numbers — never ReactNode. */
  value: (row: T) => string | number;
}

/**
 * Build a one-sheet workbook from `rows` × `columns` and trigger a download.
 * The file is named `${filenamePrefix}-YYYY-MM-DD.xlsx`.
 */
export async function exportToXlsx<T>(
  filenamePrefix: string,
  sheetName: string,
  columns: XlsxColumn<T>[],
  rows: T[],
): Promise<void> {
  const XLSX = await import('xlsx');
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column.header, column.value(row)])),
  );
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: columns.map((column) => column.header),
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${stamp}.xlsx`);
}
