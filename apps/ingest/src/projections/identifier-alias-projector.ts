import { query } from "@kalshi-quant-dashboard/db";

export function buildLifecycleSearchText(values: readonly (string | null | undefined)[]): string {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.toLowerCase())
    .join(" ");
}

export function matchesLifecycleSearchText(haystack: string, search: string | undefined): boolean {
  if (!search || search.trim().length === 0) {
    return true;
  }

  return haystack.includes(search.trim().toLowerCase());
}

export async function projectIdentifierAliasesForCorrelation(
  correlationId: string
): Promise<string[]> {
  const result = await query<{ alias_value: string }>(
    `
      select distinct ia.alias_value
      from identifier_aliases ia
      inner join canonical_events ce
        on ce.canonical_event_id = ia.canonical_event_id
      where ce.correlation_id = $1
      order by ia.alias_value asc
    `,
    [correlationId]
  );

  return result.rows.map((row) => row.alias_value);
}
