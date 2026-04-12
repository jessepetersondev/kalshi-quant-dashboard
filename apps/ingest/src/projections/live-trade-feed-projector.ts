import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  tradeRowSchema,
  type TradeRow
} from "@kalshi-quant-dashboard/contracts";

interface TradeFeedRow {
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

function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString();
}

export async function projectLiveTradeFeed(args: {
  readonly strategyScope: readonly string[];
  readonly limit?: number;
}): Promise<TradeRow[]> {
  const result = await query<TradeFeedRow>(
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
      order by coalesce(updated_at, occurred_at) desc
    `
  );

  return result.rows
    .filter(
      (row) =>
        row.strategy_id === null
          ? args.strategyScope.includes("*")
          : scopeAllows(args.strategyScope, row.strategy_id)
    )
    .slice(0, args.limit ?? 10)
    .map((row) =>
      tradeRowSchema.parse({
        correlationId: row.correlation_id,
        tradeAttemptKey: row.trade_id,
        strategyId: row.strategy_id ?? "unknown",
        symbol: row.strategy_id?.toUpperCase() ?? undefined,
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
