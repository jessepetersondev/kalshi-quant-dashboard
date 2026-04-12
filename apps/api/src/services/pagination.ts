export type PaginatedResource =
  | "decisions"
  | "trades"
  | "skips"
  | "alerts"
  | "accessPolicies"
  | "auditLogs"
  | "exports";

const PAGINATION_LIMITS: Record<
  PaginatedResource,
  { readonly defaultPageSize: number; readonly maxPageSize: number }
> = {
  decisions: { defaultPageSize: 50, maxPageSize: 100 },
  trades: { defaultPageSize: 50, maxPageSize: 100 },
  skips: { defaultPageSize: 50, maxPageSize: 100 },
  alerts: { defaultPageSize: 50, maxPageSize: 100 },
  accessPolicies: { defaultPageSize: 50, maxPageSize: 100 },
  auditLogs: { defaultPageSize: 50, maxPageSize: 100 },
  exports: { defaultPageSize: 100, maxPageSize: 500 }
};

export function getPaginationLimits(resource: PaginatedResource) {
  return PAGINATION_LIMITS[resource];
}

export function normalizePaginationQuery<
  Query extends {
    readonly page?: number;
    readonly pageSize?: number;
  }
>(resource: PaginatedResource, query: Query): Query & { readonly page: number; readonly pageSize: number } {
  const limits = PAGINATION_LIMITS[resource];
  const requestedPage = Number(query.page ?? 1);
  const requestedPageSize = Number(query.pageSize ?? limits.defaultPageSize);

  return {
    ...query,
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: Math.min(
      limits.maxPageSize,
      Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? requestedPageSize
        : limits.defaultPageSize
    )
  };
}

export function shouldExpandSearchToAllTime(
  rawInput: unknown,
  parsedQuery: {
    readonly search?: string | undefined;
    readonly range?: string | undefined;
  }
): boolean {
  if (typeof parsedQuery.search !== "string" || parsedQuery.search.trim().length === 0) {
    return false;
  }

  if (rawInput === null || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return false;
  }

  const rawRange = (rawInput as Record<string, unknown>).range;
  if (rawRange === undefined || rawRange === null) {
    return true;
  }

  return typeof rawRange === "string" && rawRange.trim().length === 0;
}
