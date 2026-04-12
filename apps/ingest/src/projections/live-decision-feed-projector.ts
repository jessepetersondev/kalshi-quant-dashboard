import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  decisionRowSchema,
  type DecisionRow
} from "@kalshi-quant-dashboard/contracts";

interface DecisionFeedRow {
  readonly correlation_id: string;
  readonly strategy_id: string;
  readonly symbol: string | null;
  readonly market_ticker: string;
  readonly action: string;
  readonly reason_raw: string;
  readonly decision_at: string;
  readonly source_path_mode: "publisher_only" | "direct_only" | "hybrid";
}

function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString();
}

export async function projectLiveDecisionFeed(args: {
  readonly strategyScope: readonly string[];
  readonly limit?: number;
}): Promise<DecisionRow[]> {
  const result = await query<DecisionFeedRow>(
    `
      select
        correlation_id,
        strategy_id,
        nullif(symbol, '') as symbol,
        market_ticker,
        action,
        reason_raw,
        decision_at::text as decision_at,
        source_path_mode
      from decisions
      order by decision_at desc
    `
  );

  return result.rows
    .filter((row) => scopeAllows(args.strategyScope, row.strategy_id))
    .slice(0, args.limit ?? 10)
    .map((row) =>
      decisionRowSchema.parse({
        correlationId: row.correlation_id,
        strategyId: row.strategy_id,
        symbol: row.symbol ?? row.strategy_id.toUpperCase(),
        marketTicker: row.market_ticker,
        decisionAction: row.action,
        reasonSummary: row.reason_raw,
        currentLifecycleStage: row.action === "skip" ? "skip" : "strategy_emission",
        currentOutcomeStatus: row.action === "skip" ? "skipped" : "emitted",
        latestEventAt: toIsoTimestamp(row.decision_at),
        sourcePathMode: row.source_path_mode,
        degraded: false
      })
    );
}
