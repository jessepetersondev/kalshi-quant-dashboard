import { query } from "@kalshi-quant-dashboard/db";
import {
  pageInfoSchema,
  skipListResponseSchema,
  skipRowSchema,
  skipTaxonomyCountSchema,
  type SkipListQuery,
  type SkipListResponse,
} from "@kalshi-quant-dashboard/contracts";

interface SkipProjectionRow {
  readonly decision_id: string;
  readonly correlation_id: string;
  readonly strategy_id: string;
  readonly symbol: string | null;
  readonly market_ticker: string;
  readonly skip_category: string | null;
  readonly skip_code: string | null;
  readonly reason_raw: string;
  readonly decision_at: string;
}

interface SkipTaxonomyProjectionRow {
  readonly skip_category: string;
  readonly skip_code: string | null;
  readonly count: number;
  readonly examples: string[] | null;
}

function resolveRangeStart(range: string, now = new Date()): Date | null {
  const value = range.toLowerCase();
  if (value === "all-time" || value === "all_time") {
    return null;
  }
  if (value === "24h") {
    return new Date(now.valueOf() - 24 * 60 * 60 * 1000);
  }
  if (value === "7d") {
    return new Date(now.valueOf() - 7 * 24 * 60 * 60 * 1000);
  }
  if (value === "30d") {
    return new Date(now.valueOf() - 30 * 24 * 60 * 60 * 1000);
  }
  if (value === "mtd") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  if (value === "ytd") {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }
  return null;
}

function addSqlParam(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

function hasWildcardScope(strategyScope: readonly string[]): boolean {
  return strategyScope[0] === "*";
}

function appendSkipConditions(
  conditions: string[],
  params: unknown[],
  args: {
    readonly strategyScope: readonly string[];
    readonly query: SkipListQuery;
  }
): void {
  conditions.push("(d.action = 'skip' or d.skip_category is not null)");

  if (!hasWildcardScope(args.strategyScope)) {
    conditions.push(
      `d.strategy_id = any(${addSqlParam(params, args.strategyScope)}::text[])`
    );
  }

  if (args.query.strategy?.length) {
    conditions.push(
      `d.strategy_id = any(${addSqlParam(params, args.query.strategy)}::text[])`
    );
  }

  if (args.query.symbol?.length) {
    conditions.push(
      `coalesce(nullif(d.symbol, ''), upper(d.strategy_id)) = any(${addSqlParam(
        params,
        args.query.symbol
      )}::text[])`
    );
  }

  if (args.query.market?.length) {
    conditions.push(
      `d.market_ticker = any(${addSqlParam(params, args.query.market)}::text[])`
    );
  }

  if (args.query.skipCategory?.length) {
    conditions.push(
      `coalesce(d.skip_category::text, 'other') = any(${addSqlParam(
        params,
        args.query.skipCategory
      )}::text[])`
    );
  }

  const rangeStart = resolveRangeStart(args.query.range);
  if (rangeStart) {
    conditions.push(
      `d.decision_at >= ${addSqlParam(params, rangeStart)}::timestamptz`
    );
  }

  const search = args.query.search?.trim();
  if (search) {
    const searchParam = addSqlParam(params, `%${search}%`);
    conditions.push(`(
      d.correlation_id ilike ${searchParam}
      or d.strategy_id ilike ${searchParam}
      or coalesce(nullif(d.symbol, ''), upper(d.strategy_id)) ilike ${searchParam}
      or d.market_ticker ilike ${searchParam}
      or coalesce(d.skip_category::text, 'other') ilike ${searchParam}
      or coalesce(d.skip_code, '') ilike ${searchParam}
      or d.reason_raw ilike ${searchParam}
    )`);
  }
}

function buildSkipWhere(args: {
  readonly strategyScope: readonly string[];
  readonly query: SkipListQuery;
}): { readonly whereSql: string; readonly params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  appendSkipConditions(conditions, params, args);

  return {
    whereSql: `where ${conditions.join("\n        and ")}`,
    params,
  };
}

async function countSkipRows(args: {
  readonly strategyScope: readonly string[];
  readonly query: SkipListQuery;
}): Promise<number> {
  const { whereSql, params } = buildSkipWhere(args);
  const result = await query<{ readonly total_items: number }>(
    `
      select count(*)::int as total_items
      from decisions d
      ${whereSql}
    `,
    params
  );

  return Number(result.rows[0]?.total_items ?? 0);
}

async function loadSkipRows(args: {
  readonly strategyScope: readonly string[];
  readonly query: SkipListQuery;
}): Promise<SkipProjectionRow[]> {
  const { whereSql, params } = buildSkipWhere(args);
  const direction = args.query.sort === "oldest" ? "asc" : "desc";
  const limitParam = addSqlParam(params, args.query.pageSize);
  const offsetParam = addSqlParam(
    params,
    (args.query.page - 1) * args.query.pageSize
  );
  const result = await query<SkipProjectionRow>(
    `
      select
        d.decision_id,
        d.correlation_id,
        d.strategy_id,
        nullif(d.symbol, '') as symbol,
        d.market_ticker,
        d.skip_category,
        d.skip_code,
        d.reason_raw,
        d.decision_at::text as decision_at
      from decisions d
      ${whereSql}
      order by d.decision_at ${direction}, d.decision_id asc
      limit ${limitParam}
      offset ${offsetParam}
    `,
    params
  );

  return result.rows;
}

async function loadSkipTaxonomyRows(args: {
  readonly strategyScope: readonly string[];
  readonly query: SkipListQuery;
}): Promise<SkipTaxonomyProjectionRow[]> {
  const { whereSql, params } = buildSkipWhere(args);
  const result = await query<SkipTaxonomyProjectionRow>(
    `
      select
        coalesce(d.skip_category::text, 'other') as skip_category,
        nullif(d.skip_code, '') as skip_code,
        count(*)::int as count,
        (array_agg(distinct d.reason_raw order by d.reason_raw))[1:3] as examples
      from decisions d
      ${whereSql}
      group by coalesce(d.skip_category::text, 'other'), nullif(d.skip_code, '')
      order by count(*) desc, coalesce(d.skip_category::text, 'other') asc
    `,
    params
  );

  return result.rows;
}

export async function projectSkipList(args: {
  readonly strategyScope: readonly string[];
  readonly query: SkipListQuery;
}): Promise<SkipListResponse> {
  const [rows, totalItems, taxonomyRows] = await Promise.all([
    loadSkipRows(args),
    countSkipRows(args),
    loadSkipTaxonomyRows(args),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / args.query.pageSize));
  const pageItems = rows.map((row) =>
    skipRowSchema.parse({
      correlationId: row.correlation_id,
      strategyId: row.strategy_id,
      symbol: row.symbol ?? row.strategy_id.toUpperCase(),
      marketTicker: row.market_ticker,
      skipCategory: row.skip_category ?? "other",
      skipCode: row.skip_code,
      reasonRaw: row.reason_raw,
      occurredAt: new Date(row.decision_at).toISOString(),
    })
  );

  return skipListResponseSchema.parse({
    items: pageItems,
    taxonomyBreakdown: taxonomyRows.map((row) =>
      skipTaxonomyCountSchema.parse({
        skipCategory: row.skip_category,
        skipCode: row.skip_code,
        count: Number(row.count),
        examples: row.examples ?? [],
      })
    ),
    pageInfo: pageInfoSchema.parse({
      page: args.query.page,
      pageSize: args.query.pageSize,
      totalItems,
      totalPages,
    }),
  });
}

export async function projectSkipStreamChanges(args: {
  readonly afterProjectionChangeId: number;
  readonly strategyScope: readonly string[];
}) {
  const result = await query<{
    projection_change_id: number;
    correlation_id: string | null;
    effective_occurred_at: string;
  }>(
    `
      select
        projection_change_id::int as projection_change_id,
        correlation_id,
        effective_occurred_at::text as effective_occurred_at
      from projection_changes
      where channel = 'skips'
        and projection_change_id > $1
      order by projection_change_id asc
    `,
    [args.afterProjectionChangeId]
  );

  const summaries = await Promise.all(
    result.rows.map(async (row) => {
      if (!row.correlation_id) {
        return null;
      }

      const summary = (
        await projectSkipList({
          strategyScope: args.strategyScope,
          query: {
            page: 1,
            pageSize: 500,
            sort: "newest",
            search: row.correlation_id,
            timezone: "utc",
            range: "all-time",
          },
        })
      ).items.find(
        (candidate) => candidate.correlationId === row.correlation_id
      );

      if (!summary) {
        return null;
      }

      return {
        projectionChangeId: row.projection_change_id,
        effectiveOccurredAt: new Date(row.effective_occurred_at).toISOString(),
        row: summary,
      };
    })
  );

  return summaries.filter(
    (value): value is NonNullable<typeof value> => value !== null
  );
}
