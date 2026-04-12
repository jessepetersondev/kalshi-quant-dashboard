import type { CsvExportResource } from "@kalshi-quant-dashboard/contracts";

export function createExportHref(
  resource: CsvExportResource,
  query: Record<string, string | number | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  return `/api/exports/${resource}.csv?${search.toString()}`;
}
