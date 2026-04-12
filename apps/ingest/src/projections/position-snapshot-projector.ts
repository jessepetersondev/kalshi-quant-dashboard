import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";

export interface PositionSnapshotProjection {
  readonly strategyId: string;
  readonly marketTicker: string;
  readonly side: string;
  readonly contracts: number;
  readonly averageEntryPrice: number;
  readonly lastMarkedPrice: number;
  readonly feesPaid: number;
  readonly status: string;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: string;
}

export async function projectLatestPositionSnapshots(args: {
  readonly strategyScope: readonly string[];
  readonly rangeEndUtc?: string | null;
}): Promise<PositionSnapshotProjection[]> {
  const values: unknown[] = [];
  const rangeClause = args.rangeEndUtc
    ? (() => {
        values.push(args.rangeEndUtc);
        return `where occurred_at <= $${values.length}`;
      })()
    : "";

  const result = await query<{
    strategy_id: string;
    market_ticker: string;
    side: string;
    contracts: number;
    average_entry_price: string;
    last_marked_price: string;
    fees_paid: string | null;
    status: string;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }>(
    `
      select distinct on (strategy_id, market_ticker)
        strategy_id,
        market_ticker,
        side,
        contracts,
        average_entry_price::text as average_entry_price,
        last_marked_price::text as last_marked_price,
        fees_paid::text as fees_paid,
        status,
        metadata,
        occurred_at::text as occurred_at
      from positions
      ${rangeClause}
      order by strategy_id, market_ticker, occurred_at desc
    `,
    values
  );

  return result.rows
    .filter((row) => scopeAllows(args.strategyScope, row.strategy_id))
    .map((row) => ({
      strategyId: row.strategy_id,
      marketTicker: row.market_ticker,
      side: row.side,
      contracts: row.contracts,
      averageEntryPrice: Number(row.average_entry_price),
      lastMarkedPrice: Number(row.last_marked_price),
      feesPaid: Number(row.fees_paid ?? 0),
      status: row.status,
      metadata: row.metadata ?? {},
      occurredAt: new Date(row.occurred_at).toISOString()
    }));
}
