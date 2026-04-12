import { projectLatestPositionSnapshots, type PositionSnapshotProjection } from "./position-snapshot-projector.js";
import { query } from "@kalshi-quant-dashboard/db";

export interface MarketPositionProjection {
  readonly strategyId: string;
  readonly symbol: string;
  readonly marketTicker: string;
  readonly realizedPnlNet: number;
  readonly unrealizedPnlNet: number;
  readonly feesTotal: number;
  readonly totalPnlNet: number;
  readonly stale: boolean;
  readonly partial: boolean;
  readonly disagreement: boolean;
  readonly freshnessTimestamp: string;
  readonly metadata: Record<string, unknown>;
}

interface TradeProjectionRow {
  readonly strategy_id: string | null;
  readonly market_ticker: string;
  readonly status: string;
  readonly metadata: Record<string, unknown>;
  readonly occurred_at: string;
}

export interface TradeComputationInput {
  readonly status: string;
  readonly metadata: Record<string, unknown>;
}

function extractNumber(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

export function isPartialTrade(record: Record<string, unknown>, status: string): boolean {
  return (
    Boolean(record.partialFill) ||
    Boolean(record.partialClose) ||
    status.toLowerCase().includes("partial")
  );
}

export function isStalePosition(position: PositionSnapshotProjection, rangeEnd: Date): boolean {
  if (position.metadata.stale === true) {
    return true;
  }

  const freshnessAgeMs = rangeEnd.valueOf() - new Date(position.occurredAt).valueOf();
  return freshnessAgeMs > 60 * 60 * 1000;
}

export function detectPnlDisagreement(
  directTotal: number | undefined,
  reconstructedTotal: number
): boolean {
  return directTotal !== undefined && Math.abs(directTotal - reconstructedTotal) > 0.01;
}

export function computeMarketPositionProjection(args: {
  readonly position: PositionSnapshotProjection;
  readonly trades: readonly TradeComputationInput[];
  readonly rangeEnd: Date;
}): MarketPositionProjection {
  const feesFromTrades = args.trades.reduce(
    (sum, row) => sum + extractNumber(row.metadata, ["feeAmount", "fee_amount", "fees", "fee"]),
    0
  );
  const realizedFromTrades = args.trades.reduce(
    (sum, row) => sum + extractNumber(row.metadata, ["realized_pnl", "realizedPnl", "cash_impact"]),
    0
  );
  const markToMarket =
    args.position.contracts > 0
      ? (args.position.lastMarkedPrice - args.position.averageEntryPrice) * args.position.contracts
      : 0;
  const openFees = args.position.feesPaid;
  const realizedPnlNet = realizedFromTrades - feesFromTrades;
  const unrealizedPnlNet = markToMarket - openFees;
  const totalPnlNet = realizedPnlNet + unrealizedPnlNet;

  return {
    strategyId: args.position.strategyId,
    symbol: args.position.strategyId.toUpperCase(),
    marketTicker: args.position.marketTicker,
    realizedPnlNet,
    unrealizedPnlNet,
    feesTotal: feesFromTrades + openFees,
    totalPnlNet,
    stale: isStalePosition(args.position, args.rangeEnd),
    partial:
      args.position.status === "partially_closed" ||
      args.trades.some((row) => isPartialTrade(row.metadata, row.status)),
    disagreement: false,
    freshnessTimestamp: args.position.occurredAt,
    metadata: {
      valuationSource: "lifecycle_reconstruction",
      latestPositionStatus: args.position.status,
      tradeCount: args.trades.length
    }
  };
}

export async function projectMarketPositionAttribution(args: {
  readonly strategyScope: readonly string[];
  readonly rangeStartUtc?: string | null;
  readonly rangeEndUtc?: string | null;
}): Promise<MarketPositionProjection[]> {
  const rangeEnd = new Date(args.rangeEndUtc ?? new Date().toISOString());
  const positions = await projectLatestPositionSnapshots({
    strategyScope: args.strategyScope,
    rangeEndUtc: rangeEnd.toISOString()
  });

  const values: unknown[] = [];
  const whereParts: string[] = ["occurred_at <= $1"];
  values.push(rangeEnd.toISOString());

  if (args.rangeStartUtc) {
    values.push(args.rangeStartUtc);
    whereParts.push(`occurred_at >= $${values.length}`);
  }

  const tradeRows = await query<TradeProjectionRow>(
    `
      select
        strategy_id,
        market_ticker,
        status,
        metadata,
        occurred_at::text as occurred_at
      from trades
      where ${whereParts.join(" and ")}
      order by occurred_at asc
    `,
    values
  );

  const directStrategySnapshots = await query<{
    strategy_id: string | null;
    total_pnl: string;
    occurred_at: string;
  }>(
    `
      select distinct on (strategy_id)
        strategy_id,
        total_pnl::text as total_pnl,
        occurred_at::text as occurred_at
      from pnl_snapshots
      where bucket_type = 'current'
        and valuation_source = 'strategy_snapshot'
      order by strategy_id, occurred_at desc
    `
  );

  const directTotals = new Map(
    directStrategySnapshots.rows
      .filter((row) => row.strategy_id)
      .map((row) => [row.strategy_id!, Number(row.total_pnl)])
  );

  const groupedTrades = new Map<string, TradeProjectionRow[]>();
  for (const row of tradeRows.rows) {
    if (!row.strategy_id) {
      continue;
    }

    const key = `${row.strategy_id}:${row.market_ticker}`;
    const group = groupedTrades.get(key) ?? [];
    group.push(row);
    groupedTrades.set(key, group);
  }

  const strategyAggregate = new Map<string, number>();
  const projections = positions.map((position) => {
    const key = `${position.strategyId}:${position.marketTicker}`;
    const trades = groupedTrades.get(key) ?? [];
    const projection = computeMarketPositionProjection({
      position,
      trades: trades.map((row) => ({
        status: row.status,
        metadata: row.metadata
      })),
      rangeEnd
    });

    strategyAggregate.set(
      position.strategyId,
      (strategyAggregate.get(position.strategyId) ?? 0) + projection.totalPnlNet
    );

    return projection;
  });

  return projections.map((projection) => {
    const directTotal = directTotals.get(projection.strategyId);
    const strategyTotal = strategyAggregate.get(projection.strategyId) ?? projection.totalPnlNet;
    const disagreement = detectPnlDisagreement(directTotal, strategyTotal);

    return {
      ...projection,
      disagreement,
      metadata: {
        ...projection.metadata,
        directSnapshotTotalPnl: directTotal ?? null,
        reconstructedStrategyTotalPnl: strategyTotal
      }
    };
  });
}
