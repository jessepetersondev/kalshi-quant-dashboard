import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  pageInfoSchema,
  skipListResponseSchema,
  skipRowSchema,
  skipTaxonomyCountSchema,
  type SkipListQuery,
  type SkipListResponse
} from "@kalshi-quant-dashboard/contracts";

interface SkipProjectionRow {
  readonly correlation_id: string;
  readonly strategy_id: string;
  readonly symbol: string | null;
  readonly market_ticker: string;
  readonly skip_category: string | null;
  readonly skip_code: string | null;
  readonly reason_raw: string;
  readonly decision_at: string;
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

async function loadSkipRows(): Promise<SkipProjectionRow[]> {
  const result = await query<SkipProjectionRow>(
    `
      select
        correlation_id,
        strategy_id,
        nullif(symbol, '') as symbol,
        market_ticker,
        skip_category,
        skip_code,
        reason_raw,
        decision_at::text as decision_at
      from decisions
      where action = 'skip' or skip_category is not null
      order by decision_at desc, decision_id asc
    `
  );

  return result.rows;
}

export async function projectSkipList(args: {
  readonly strategyScope: readonly string[];
  readonly query: SkipListQuery;
}): Promise<SkipListResponse> {
  const rangeStart = resolveRangeStart(args.query.range);
  const rows = (await loadSkipRows()).filter((row) => {
    if (!scopeAllows(args.strategyScope, row.strategy_id)) {
      return false;
    }

    if (args.query.strategy?.length && !args.query.strategy.includes(row.strategy_id)) {
      return false;
    }

    const symbol = row.symbol ?? row.strategy_id.toUpperCase();
    if (args.query.symbol?.length && !args.query.symbol.includes(symbol)) {
      return false;
    }

    if (args.query.market?.length && !args.query.market.includes(row.market_ticker)) {
      return false;
    }

    if (
      args.query.skipCategory?.length &&
      !args.query.skipCategory.includes(row.skip_category ?? "other")
    ) {
      return false;
    }

    if (rangeStart && new Date(row.decision_at) < rangeStart) {
      return false;
    }

    if (!args.query.search?.trim()) {
      return true;
    }

    const needle = args.query.search.trim().toLowerCase();
    return [
      row.correlation_id,
      row.strategy_id,
      symbol,
      row.market_ticker,
      row.skip_category ?? "other",
      row.skip_code ?? "",
      row.reason_raw
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const ordered = rows.sort((left, right) =>
    args.query.sort === "oldest"
      ? new Date(left.decision_at).valueOf() - new Date(right.decision_at).valueOf()
      : new Date(right.decision_at).valueOf() - new Date(left.decision_at).valueOf()
  );
  const totalItems = ordered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / args.query.pageSize));
  const pageStart = (args.query.page - 1) * args.query.pageSize;
  const pageItems = ordered.slice(pageStart, pageStart + args.query.pageSize).map((row) =>
    skipRowSchema.parse({
      correlationId: row.correlation_id,
      strategyId: row.strategy_id,
      symbol: row.symbol ?? row.strategy_id.toUpperCase(),
      marketTicker: row.market_ticker,
      skipCategory: row.skip_category ?? "other",
      skipCode: row.skip_code,
      reasonRaw: row.reason_raw,
      occurredAt: new Date(row.decision_at).toISOString()
    })
  );

  const taxonomyMap = new Map<string, { count: number; examples: string[] }>();
  for (const row of ordered) {
    const key = `${row.skip_category ?? "other"}::${row.skip_code ?? ""}`;
    const current = taxonomyMap.get(key) ?? { count: 0, examples: [] };
    current.count += 1;
    if (current.examples.length < 3 && !current.examples.includes(row.reason_raw)) {
      current.examples.push(row.reason_raw);
    }
    taxonomyMap.set(key, current);
  }

  return skipListResponseSchema.parse({
    items: pageItems,
    taxonomyBreakdown: [...taxonomyMap.entries()]
      .map(([key, value]) => {
        const [skipCategory, skipCode] = key.split("::");
        return skipTaxonomyCountSchema.parse({
          skipCategory,
          skipCode: skipCode || null,
          count: value.count,
          examples: value.examples
        });
      })
      .sort((left, right) => right.count - left.count || left.skipCategory.localeCompare(right.skipCategory)),
    pageInfo: pageInfoSchema.parse({
      page: args.query.page,
      pageSize: args.query.pageSize,
      totalItems,
      totalPages
    })
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
            range: "all-time"
          }
        })
      ).items.find((candidate) => candidate.correlationId === row.correlation_id);

      if (!summary) {
        return null;
      }

      return {
        projectionChangeId: row.projection_change_id,
        effectiveOccurredAt: new Date(row.effective_occurred_at).toISOString(),
        row: summary
      };
    })
  );

  return summaries.filter((value): value is NonNullable<typeof value> => value !== null);
}
