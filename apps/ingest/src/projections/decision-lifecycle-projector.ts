import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  decisionListResponseSchema,
  decisionRowSchema,
  type DecisionListQuery,
  type DecisionListResponse,
  type DecisionRow
} from "@kalshi-quant-dashboard/contracts";

import {
  buildLifecycleSearchText,
  matchesLifecycleSearchText,
  projectIdentifierAliasesForCorrelation
} from "./identifier-alias-projector.js";

interface DecisionProjectionRow {
  readonly decision_id: string;
  readonly correlation_id: string;
  readonly strategy_id: string;
  readonly symbol: string | null;
  readonly market_ticker: string;
  readonly action: string;
  readonly reason_raw: string;
  readonly decision_at: string;
  readonly source_path_mode: "publisher_only" | "direct_only" | "hybrid";
  readonly latest_lifecycle_stage: string | null;
  readonly latest_event_at: string | null;
  readonly latest_reconciliation_status: string | null;
  readonly latest_degraded_reasons: string[] | null;
  readonly latest_trade_status: string | null;
  readonly broker_routing_key: string | null;
  readonly aliases: string[] | null;
}

interface DecisionStreamRow {
  readonly projection_change_id: number;
  readonly correlation_id: string;
  readonly effective_occurred_at: string | null;
}

function toIsoTimestamp(value: string | null | undefined): string {
  return new Date(value ?? new Date().toISOString()).toISOString();
}

function isDegraded(row: Pick<
  DecisionProjectionRow,
  "latest_degraded_reasons" | "latest_reconciliation_status"
>): boolean {
  return (
    (row.latest_degraded_reasons?.length ?? 0) > 0 ||
    row.latest_reconciliation_status === "partial" ||
    row.latest_reconciliation_status === "gap_detected"
  );
}

function toDecisionRow(row: DecisionProjectionRow): DecisionRow {
  return decisionRowSchema.parse({
    correlationId: row.correlation_id,
    strategyId: row.strategy_id,
    symbol: row.symbol ?? row.strategy_id.toUpperCase(),
    marketTicker: row.market_ticker,
    decisionAction: row.action,
    reasonSummary: row.reason_raw,
    currentLifecycleStage:
      row.latest_lifecycle_stage ?? (row.action === "skip" ? "skip" : "strategy_emission"),
    currentOutcomeStatus:
      row.latest_trade_status ?? (row.action === "skip" ? "skipped" : "emitted"),
    latestEventAt: toIsoTimestamp(row.latest_event_at ?? row.decision_at),
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

async function loadDecisionProjectionRows(): Promise<DecisionProjectionRow[]> {
  const result = await query<DecisionProjectionRow>(
    `
      select
        d.decision_id,
        d.correlation_id,
        d.strategy_id,
        nullif(d.symbol, '') as symbol,
        d.market_ticker,
        d.action,
        d.reason_raw,
        d.decision_at::text as decision_at,
        d.source_path_mode,
        latest.lifecycle_stage as latest_lifecycle_stage,
        latest.occurred_at::text as latest_event_at,
        latest.reconciliation_status as latest_reconciliation_status,
        latest.degraded_reasons as latest_degraded_reasons,
        latest.broker_routing_key,
        latest_trade.status as latest_trade_status,
        alias_data.aliases
      from decisions d
      left join lateral (
        select
          ce.lifecycle_stage,
          ce.occurred_at,
          ce.reconciliation_status,
          ce.degraded_reasons,
          ce.ordering ->> 'brokerRoutingKey' as broker_routing_key
        from canonical_events ce
        where ce.correlation_id = d.correlation_id
        order by ce.occurred_at desc, ce.first_seen_at desc, ce.canonical_event_id desc
        limit 1
      ) latest on true
      left join lateral (
        select t.status
        from trades t
        where t.correlation_id = d.correlation_id
        order by coalesce(t.terminal_state_at, t.occurred_at) desc, t.updated_at desc
        limit 1
      ) latest_trade on true
      left join lateral (
        select array_agg(distinct ia.alias_value order by ia.alias_value) as aliases
        from identifier_aliases ia
        inner join canonical_events ce
          on ce.canonical_event_id = ia.canonical_event_id
        where ce.correlation_id = d.correlation_id
      ) alias_data on true
      order by coalesce(latest.occurred_at, d.decision_at) desc, d.decision_id asc
    `
  );

  return result.rows;
}

function filterDecisionRows(
  rows: readonly DecisionProjectionRow[],
  args: { readonly strategyScope: readonly string[]; readonly query: DecisionListQuery }
): DecisionProjectionRow[] {
  const rangeStart = resolveRangeStart(args.query.range);
  const filtered = rows.filter((row) => {
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

    const lifecycleStage =
      row.latest_lifecycle_stage ?? (row.action === "skip" ? "skip" : "strategy_emission");
    if (
      args.query.lifecycleStage?.length &&
      !args.query.lifecycleStage.includes(lifecycleStage)
    ) {
      return false;
    }

    if (args.query.degraded !== undefined && isDegraded(row) !== args.query.degraded) {
      return false;
    }

    if (rangeStart) {
      const latestAt = new Date(row.latest_event_at ?? row.decision_at);
      if (latestAt < rangeStart) {
        return false;
      }
    }

    const haystack = buildLifecycleSearchText([
      row.correlation_id,
      row.decision_id,
      row.strategy_id,
      symbol,
      row.market_ticker,
      row.action,
      row.reason_raw,
      row.latest_trade_status,
      row.broker_routing_key,
      ...(row.aliases ?? [])
    ]);

    return matchesLifecycleSearchText(haystack, args.query.search);
  });

  return filtered.sort((left, right) => {
    const comparator =
      new Date(right.latest_event_at ?? right.decision_at).valueOf() -
      new Date(left.latest_event_at ?? left.decision_at).valueOf();

    if (args.query.sort === "oldest") {
      return comparator * -1;
    }

    return comparator || left.decision_id.localeCompare(right.decision_id);
  });
}

export async function projectDecisionLifecycleList(args: {
  readonly strategyScope: readonly string[];
  readonly query: DecisionListQuery;
}): Promise<DecisionListResponse> {
  const filtered = filterDecisionRows(await loadDecisionProjectionRows(), args);
  const start = (args.query.page - 1) * args.query.pageSize;
  const paged = filtered.slice(start, start + args.query.pageSize).map(toDecisionRow);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / args.query.pageSize));

  return decisionListResponseSchema.parse({
    items: paged,
    pageInfo: {
      page: args.query.page,
      pageSize: args.query.pageSize,
      totalItems,
      totalPages
    }
  });
}

export async function projectDecisionSummary(
  correlationId: string,
  strategyScope: readonly string[]
): Promise<DecisionRow | null> {
  const rows = filterDecisionRows(await loadDecisionProjectionRows(), {
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
  return row ? toDecisionRow(row) : null;
}

export async function projectDecisionStreamChanges(args: {
  readonly afterProjectionChangeId: number;
  readonly strategyScope: readonly string[];
}): Promise<
  {
    readonly projectionChangeId: number;
    readonly effectiveOccurredAt: string;
    readonly row: DecisionRow;
  }[]
> {
  const result = await query<DecisionStreamRow>(
    `
      select
        pc.projection_change_id::int as projection_change_id,
        pc.correlation_id,
        pc.effective_occurred_at::text as effective_occurred_at
      from projection_changes pc
      where pc.channel = 'decisions'
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

      const summary = await projectDecisionSummary(row.correlation_id, args.strategyScope);
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

export async function projectDecisionAliases(correlationId: string): Promise<string[]> {
  return projectIdentifierAliasesForCorrelation(correlationId);
}
