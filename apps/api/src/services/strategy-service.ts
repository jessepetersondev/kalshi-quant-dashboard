import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  alertRowSchema,
  decisionRowSchema,
  pnlSummaryCardSchema,
  skipRowSchema,
  strategyDetailResponseSchema,
  strategyListResponseSchema,
  tradeRowSchema,
  type StrategyDetailResponse,
  type StrategyListResponse
} from "@kalshi-quant-dashboard/contracts";

import {
  projectStrategySummaries,
  projectStrategySummary
} from "../../../ingest/src/projections/strategy-summary-projector.js";

interface DecisionDetailRow {
  readonly correlation_id: string;
  readonly strategy_id: string;
  readonly symbol: string | null;
  readonly market_ticker: string;
  readonly action: string;
  readonly reason_raw: string;
  readonly decision_at: string;
  readonly skip_category: string | null;
  readonly skip_code: string | null;
  readonly source_path_mode: "publisher_only" | "direct_only" | "hybrid";
}

interface TradeDetailRow {
  readonly correlation_id: string;
  readonly trade_id: string;
  readonly strategy_id: string | null;
  readonly market_ticker: string;
  readonly status: string;
  readonly terminal_state_at: string | null;
  readonly source_path_mode: "publisher_only" | "direct_only" | "hybrid";
  readonly occurred_at: string;
  readonly updated_at: string;
}

interface StrategyPnlRow {
  readonly strategy_id: string | null;
  readonly realized_pnl: string;
  readonly unrealized_pnl: string;
  readonly fees: string;
  readonly stale: boolean;
  readonly partial: boolean;
  readonly occurred_at: string;
  readonly metadata: Record<string, unknown>;
}

interface StrategyAlertRow {
  readonly alert_id: string;
  readonly alert_type: string;
  readonly severity: string;
  readonly status: string;
  readonly summary: string;
  readonly affected_component: string;
  readonly last_seen_at: string;
}

function toIsoTimestamp(value: string | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export class StrategyService {
  async listStrategies(args: {
    readonly strategyScope: readonly string[];
    readonly generatedAt?: string;
  }): Promise<StrategyListResponse> {
    return strategyListResponseSchema.parse({
      items: await projectStrategySummaries(args)
    });
  }

  async getStrategyDetail(args: {
    readonly strategyId: string;
    readonly strategyScope: readonly string[];
    readonly generatedAt?: string;
  }): Promise<StrategyDetailResponse | null> {
    if (!scopeAllows(args.strategyScope, args.strategyId)) {
      return null;
    }

    const strategy = await projectStrategySummary(args);
    if (!strategy) {
      return null;
    }

    const [pnlSummary, recentDecisions, recentTrades, recentSkips, activeAlerts] =
      await Promise.all([
        this.loadPnlSummary(args.strategyId, args.generatedAt),
        this.loadDecisions(args.strategyId),
        this.loadTrades(args.strategyId),
        this.loadSkips(args.strategyId),
        this.loadAlerts(args.strategyId)
      ]);

    return strategyDetailResponseSchema.parse({
      strategy,
      pnlSummary,
      recentDecisions,
      recentTrades,
      recentSkips,
      activeAlerts
    });
  }

  private async loadPnlSummary(
    strategyId: string,
    generatedAt = new Date().toISOString()
  ) {
    const result = await query<StrategyPnlRow>(
      `
        select
          strategy_id,
          realized_pnl::text as realized_pnl,
          unrealized_pnl::text as unrealized_pnl,
          fees::text as fees,
          stale,
          partial,
          occurred_at::text as occurred_at,
          metadata
        from pnl_snapshots
        where strategy_id = $1
          and bucket_type = 'current'
        order by occurred_at desc
        limit 1
      `,
      [strategyId]
    );
    const row = result.rows[0];

    return pnlSummaryCardSchema.parse({
      scopeType: "strategy",
      scopeKey: strategyId,
      realizedPnlNet: Number(row?.realized_pnl ?? 0),
      unrealizedPnlNet: Number(row?.unrealized_pnl ?? 0),
      feesTotal: Number(row?.fees ?? 0),
      stale: row?.stale ?? false,
      partial: row?.partial ?? false,
      freshnessTimestamp: toIsoTimestamp(row?.occurred_at) ?? generatedAt,
      disagreementCount: Number(row?.metadata?.disagreementCount ?? 0)
    });
  }

  private async loadDecisions(strategyId: string) {
    const result = await query<DecisionDetailRow>(
      `
        select
          correlation_id,
          strategy_id,
          nullif(symbol, '') as symbol,
          market_ticker,
          action,
          reason_raw,
          decision_at::text as decision_at,
          skip_category,
          skip_code,
          source_path_mode
        from decisions
        where strategy_id = $1
          and action <> 'skip'
        order by decision_at desc
        limit 10
      `,
      [strategyId]
    );

    return result.rows.map((row) =>
      decisionRowSchema.parse({
        correlationId: row.correlation_id,
        strategyId: row.strategy_id,
        symbol: row.symbol ?? row.strategy_id.toUpperCase(),
        marketTicker: row.market_ticker,
        decisionAction: row.action,
        reasonSummary: row.reason_raw,
        currentLifecycleStage: "strategy_emission",
        currentOutcomeStatus: "emitted",
        latestEventAt: toIsoTimestamp(row.decision_at),
        sourcePathMode: row.source_path_mode,
        degraded: false
      })
    );
  }

  private async loadTrades(strategyId: string) {
    const result = await query<TradeDetailRow>(
      `
        select
          correlation_id,
          trade_id,
          strategy_id,
          market_ticker,
          status,
          terminal_state_at::text as terminal_state_at,
          source_path_mode,
          occurred_at::text as occurred_at,
          updated_at::text as updated_at
        from trades
        where strategy_id = $1
        order by coalesce(updated_at, occurred_at) desc
        limit 10
      `,
      [strategyId]
    );

    return result.rows.map((row) =>
      tradeRowSchema.parse({
        correlationId: row.correlation_id,
        tradeAttemptKey: row.trade_id,
        strategyId: row.strategy_id ?? strategyId,
        symbol: strategyId.toUpperCase(),
        marketTicker: row.market_ticker,
        status: row.status,
        publishStatus: row.status === "order.created" ? "published" : null,
        lastResultStatus: row.terminal_state_at ? row.status : null,
        latestSeenAt: toIsoTimestamp(row.updated_at ?? row.occurred_at),
        sourcePathMode: row.source_path_mode,
        degraded: false
      })
    );
  }

  private async loadSkips(strategyId: string) {
    const result = await query<DecisionDetailRow>(
      `
        select
          correlation_id,
          strategy_id,
          nullif(symbol, '') as symbol,
          market_ticker,
          action,
          reason_raw,
          decision_at::text as decision_at,
          skip_category,
          skip_code,
          source_path_mode
        from decisions
        where strategy_id = $1
          and (action = 'skip' or skip_category is not null)
        order by decision_at desc
        limit 10
      `,
      [strategyId]
    );

    return result.rows.map((row) =>
      skipRowSchema.parse({
        correlationId: row.correlation_id,
        strategyId: row.strategy_id,
        symbol: row.symbol ?? row.strategy_id.toUpperCase(),
        marketTicker: row.market_ticker,
        skipCategory: row.skip_category ?? "other",
        skipCode: row.skip_code,
        reasonRaw: row.reason_raw,
        occurredAt: toIsoTimestamp(row.decision_at)
      })
    );
  }

  private async loadAlerts(strategyId: string) {
    const result = await query<StrategyAlertRow>(
      `
        select
          alert_id,
          alert_type,
          severity,
          status,
          summary,
          affected_component,
          last_seen_at::text as last_seen_at
        from alerts
        where strategy_id = $1
          and status in ('open', 'acknowledged')
        order by last_seen_at desc
        limit 10
      `,
      [strategyId]
    );

    return result.rows.map((row) =>
      alertRowSchema.parse({
        alertId: row.alert_id,
        alertType: row.alert_type,
        severity: row.severity,
        status: row.status,
        summary: row.summary,
        componentType: "strategy",
        componentKey: strategyId,
        latestSeenAt: toIsoTimestamp(row.last_seen_at),
        detailPath: `/alerts/${row.alert_id}`
      })
    );
  }
}
