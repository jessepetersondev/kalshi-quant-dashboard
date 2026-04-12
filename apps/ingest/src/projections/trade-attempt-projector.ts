import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  tradeListResponseSchema,
  tradeRowSchema,
  type TradeListQuery,
  type TradeListResponse,
  type TradeRow
} from "@kalshi-quant-dashboard/contracts";

import { buildLifecycleSearchText, matchesLifecycleSearchText } from "./identifier-alias-projector.js";

interface TradeProjectionRow {
  readonly trade_id: string;
  readonly correlation_id: string;
  readonly strategy_id: string | null;
  readonly symbol: string | null;
  readonly market_ticker: string;
  readonly status: string;
  readonly terminal_state_at: string | null;
  readonly source_path_mode: "publisher_only" | "direct_only" | "hybrid";
  readonly occurred_at: string;
  readonly updated_at: string;
  readonly retry_count: number | null;
  readonly latest_reconciliation_status: string | null;
  readonly degraded_reasons: string[] | null;
  readonly broker_routing_key: string | null;
  readonly aliases: string[] | null;
}

interface TradeStreamRow {
  readonly projection_change_id: number;
  readonly correlation_id: string;
  readonly effective_occurred_at: string | null;
}

function toIsoTimestamp(value: string | null | undefined): string {
  return new Date(value ?? new Date().toISOString()).toISOString();
}

function isDegraded(row: Pick<
  TradeProjectionRow,
  "degraded_reasons" | "latest_reconciliation_status"
>): boolean {
  return (
    (row.degraded_reasons?.length ?? 0) > 0 ||
    row.latest_reconciliation_status === "partial" ||
    row.latest_reconciliation_status === "gap_detected"
  );
}

function toTradeRow(row: TradeProjectionRow): TradeRow {
  const strategyId = row.strategy_id ?? "unknown";

  return tradeRowSchema.parse({
    correlationId: row.correlation_id,
    tradeAttemptKey: row.trade_id,
    strategyId,
    symbol: row.symbol ?? (strategyId === "unknown" ? undefined : strategyId.toUpperCase()),
    marketTicker: row.market_ticker,
    status: row.status,
    publishStatus:
      row.status === "order.created" || row.status === "accepted" ? "published" : null,
    lastResultStatus: row.terminal_state_at ? row.status : null,
    latestSeenAt: toIsoTimestamp(row.updated_at ?? row.occurred_at),
    sourcePathMode: row.source_path_mode,
    degraded: isDegraded(row)
  });
}

function resolveRangeStart(range: string, now = new Date()): Date | null {
  const value = range.toLowerCase();
  if (value === "all-time") {
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

async function loadTradeProjectionRows(): Promise<TradeProjectionRow[]> {
  const result = await query<TradeProjectionRow>(
    `
      select
        t.trade_id,
        t.correlation_id,
        t.strategy_id,
        strategies.symbol,
        t.market_ticker,
        t.status,
        t.terminal_state_at::text as terminal_state_at,
        t.source_path_mode,
        t.occurred_at::text as occurred_at,
        t.updated_at::text as updated_at,
        t.retry_count,
        latest.reconciliation_status as latest_reconciliation_status,
        t.degraded_reasons,
        latest.broker_routing_key,
        alias_data.aliases
      from trades t
      left join strategies
        on strategies.strategy_id = t.strategy_id
      left join lateral (
        select
          ce.reconciliation_status,
          ce.ordering ->> 'brokerRoutingKey' as broker_routing_key
        from canonical_events ce
        where ce.correlation_id = t.correlation_id
        order by ce.occurred_at desc, ce.first_seen_at desc, ce.canonical_event_id desc
        limit 1
      ) latest on true
      left join lateral (
        select array_agg(distinct ia.alias_value order by ia.alias_value) as aliases
        from identifier_aliases ia
        inner join canonical_events ce
          on ce.canonical_event_id = ia.canonical_event_id
        where ce.correlation_id = t.correlation_id
      ) alias_data on true
      order by coalesce(t.updated_at, t.occurred_at) desc, t.trade_id asc
    `
  );

  return result.rows;
}

function filterTradeRows(
  rows: readonly TradeProjectionRow[],
  args: { readonly strategyScope: readonly string[]; readonly query: TradeListQuery }
): TradeProjectionRow[] {
  const rangeStart = resolveRangeStart(args.query.range);
  const filtered = rows.filter((row) => {
    if (row.strategy_id && !scopeAllows(args.strategyScope, row.strategy_id)) {
      return false;
    }

    if (args.query.strategy?.length) {
      if (!row.strategy_id || !args.query.strategy.includes(row.strategy_id)) {
        return false;
      }
    }

    const symbol = row.symbol ?? row.strategy_id?.toUpperCase() ?? "UNKNOWN";
    if (args.query.symbol?.length && !args.query.symbol.includes(symbol)) {
      return false;
    }

    if (args.query.market?.length && !args.query.market.includes(row.market_ticker)) {
      return false;
    }

    if (args.query.status?.length && !args.query.status.includes(row.status)) {
      return false;
    }

    if (
      args.query.lifecycleStage?.length &&
      !args.query.lifecycleStage.includes(row.terminal_state_at ? "terminal" : "submission")
    ) {
      return false;
    }

    if (args.query.degraded !== undefined && isDegraded(row) !== args.query.degraded) {
      return false;
    }

    if (rangeStart) {
      const latestAt = new Date(row.updated_at ?? row.occurred_at);
      if (latestAt < rangeStart) {
        return false;
      }
    }

    const haystack = buildLifecycleSearchText([
      row.correlation_id,
      row.trade_id,
      row.strategy_id ?? undefined,
      symbol,
      row.market_ticker,
      row.status,
      row.broker_routing_key,
      ...(row.aliases ?? [])
    ]);

    return matchesLifecycleSearchText(haystack, args.query.search);
  });

  return filtered.sort((left, right) => {
    const comparator =
      new Date(right.updated_at ?? right.occurred_at).valueOf() -
      new Date(left.updated_at ?? left.occurred_at).valueOf();

    if (args.query.sort === "oldest") {
      return comparator * -1;
    }

    return comparator || left.trade_id.localeCompare(right.trade_id);
  });
}

export async function projectTradeAttemptList(args: {
  readonly strategyScope: readonly string[];
  readonly query: TradeListQuery;
}): Promise<TradeListResponse> {
  const filtered = filterTradeRows(await loadTradeProjectionRows(), args);
  const start = (args.query.page - 1) * args.query.pageSize;
  const paged = filtered.slice(start, start + args.query.pageSize).map(toTradeRow);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / args.query.pageSize));

  return tradeListResponseSchema.parse({
    items: paged,
    pageInfo: {
      page: args.query.page,
      pageSize: args.query.pageSize,
      totalItems,
      totalPages
    }
  });
}

export async function projectTradeAttemptSummary(
  correlationId: string,
  strategyScope: readonly string[]
): Promise<TradeRow | null> {
  const rows = filterTradeRows(await loadTradeProjectionRows(), {
    strategyScope,
    query: {
      page: 1,
      pageSize: 500,
      sort: "newest",
      search: undefined,
      timezone: "utc",
      range: "all-time",
      detailLevel: "standard"
    }
  });

  const row = rows.find((candidate) => candidate.correlation_id === correlationId);
  return row ? toTradeRow(row) : null;
}

export async function projectTradeStreamChanges(args: {
  readonly afterProjectionChangeId: number;
  readonly strategyScope: readonly string[];
}): Promise<
  {
    readonly projectionChangeId: number;
    readonly effectiveOccurredAt: string;
    readonly row: TradeRow;
  }[]
> {
  const result = await query<TradeStreamRow>(
    `
      select
        pc.projection_change_id::int as projection_change_id,
        pc.correlation_id,
        pc.effective_occurred_at::text as effective_occurred_at
      from projection_changes pc
      where pc.channel = 'trades'
        and pc.projection_change_id > $1
      order by pc.projection_change_id asc
    `,
    [args.afterProjectionChangeId]
  );

  const summaries = await Promise.all(
    result.rows.map(async (row) => {
      if (!row.correlation_id) {
        return null;
      }

      const summary = await projectTradeAttemptSummary(row.correlation_id, args.strategyScope);
      if (!summary) {
        return null;
      }

      return {
        projectionChangeId: Number(row.projection_change_id),
        effectiveOccurredAt: toIsoTimestamp(row.effective_occurred_at),
        row: summary
      };
    })
  );

  return summaries.filter((value): value is NonNullable<typeof value> => value !== null);
}
