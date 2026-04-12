import {
  aggregatePnlSummaries
} from "./overview-projector.js";
import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import {
  pnlAttributionRowSchema,
  pnlCompareSeriesSchema,
  pnlSummaryCardSchema,
  pnlSummaryResponseSchema,
  pnlTimeseriesPointSchema,
  pnlTimeseriesResponseSchema,
  pnlWinLossSummarySchema,
  type PnlBucket,
  type PnlSummaryQuery,
  type PnlSummaryResponse,
  type PnlTimeseriesQuery,
  type PnlTimeseriesResponse
} from "@kalshi-quant-dashboard/contracts";
import { query } from "@kalshi-quant-dashboard/db";

import { projectMarketPositionAttribution } from "./market-position-projector.js";

function normalizeBucket(bucket: string): PnlBucket {
  if (bucket === "all_time") {
    return "all-time";
  }

  return bucket as PnlBucket;
}

function resolveRange(args: {
  readonly bucket: string;
  readonly rangeStartUtc?: string | null | undefined;
  readonly rangeEndUtc?: string | null | undefined;
}): { start: string; end: string } {
  const end = new Date(args.rangeEndUtc ?? new Date().toISOString());

  if (args.bucket === "custom" && args.rangeStartUtc) {
    return { start: new Date(args.rangeStartUtc).toISOString(), end: end.toISOString() };
  }

  if (args.bucket === "24h") {
    return {
      start: new Date(end.valueOf() - 24 * 60 * 60 * 1000).toISOString(),
      end: end.toISOString()
    };
  }

  if (args.bucket === "7d") {
    return {
      start: new Date(end.valueOf() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: end.toISOString()
    };
  }

  if (args.bucket === "30d") {
    return {
      start: new Date(end.valueOf() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: end.toISOString()
    };
  }

  if (args.bucket === "mtd") {
    return {
      start: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)).toISOString(),
      end: end.toISOString()
    };
  }

  if (args.bucket === "ytd") {
    return {
      start: new Date(Date.UTC(end.getUTCFullYear(), 0, 1)).toISOString(),
      end: end.toISOString()
    };
  }

  return { start: new Date("2020-01-01T00:00:00Z").toISOString(), end: end.toISOString() };
}

function toSummaryCard(args: {
  readonly scopeType: "portfolio" | "strategy" | "symbol" | "market";
  readonly scopeKey: string;
  readonly realizedPnlNet: number;
  readonly unrealizedPnlNet: number;
  readonly feesTotal: number;
  readonly stale: boolean;
  readonly partial: boolean;
  readonly freshnessTimestamp: string;
  readonly disagreementCount: number;
}) {
  return pnlSummaryCardSchema.parse({
    scopeType: args.scopeType,
    scopeKey: args.scopeKey,
    realizedPnlNet: args.realizedPnlNet,
    unrealizedPnlNet: args.unrealizedPnlNet,
    feesTotal: args.feesTotal,
    stale: args.stale,
    partial: args.partial,
    freshnessTimestamp: args.freshnessTimestamp,
    disagreementCount: args.disagreementCount
  });
}

function toSummaryCardFromAttribution(args: {
  readonly scopeType: "strategy" | "symbol" | "market";
  readonly scopeKey: string;
  readonly realizedPnlNet: number;
  readonly unrealizedPnlNet: number;
  readonly feesTotal: number;
  readonly stale: boolean;
  readonly partial: boolean;
  readonly freshnessTimestamp: string | null | undefined;
  readonly disagreement: boolean;
}) {
  return toSummaryCard({
    scopeType: args.scopeType,
    scopeKey: args.scopeKey,
    realizedPnlNet: args.realizedPnlNet,
    unrealizedPnlNet: args.unrealizedPnlNet,
    feesTotal: args.feesTotal,
    stale: args.stale,
    partial: args.partial,
    freshnessTimestamp: args.freshnessTimestamp ?? new Date().toISOString(),
    disagreementCount: args.disagreement ? 1 : 0
  });
}

function aggregateRows(
  rows: readonly {
    readonly scopeKey: string;
    readonly label: string;
    readonly realizedPnlNet: number;
    readonly unrealizedPnlNet: number;
    readonly feesTotal: number;
    readonly stale: boolean;
    readonly partial: boolean;
    readonly disagreement: boolean;
    readonly freshnessTimestamp: string;
    readonly metadata: Record<string, unknown>;
  }[],
  scopeType: "strategy" | "symbol" | "market"
) {
  return rows.map((row) =>
    pnlAttributionRowSchema.parse({
      scopeType,
      scopeKey: row.scopeKey,
      label: row.label,
      realizedPnlNet: row.realizedPnlNet,
      unrealizedPnlNet: row.unrealizedPnlNet,
      feesTotal: row.feesTotal,
      totalPnlNet: row.realizedPnlNet + row.unrealizedPnlNet,
      stale: row.stale,
      partial: row.partial,
      disagreement: row.disagreement,
      freshnessTimestamp: row.freshnessTimestamp,
      metadata: row.metadata
    })
  );
}

export async function projectPnlSummary(args: {
  readonly strategyScope: readonly string[];
  readonly query: PnlSummaryQuery;
}): Promise<PnlSummaryResponse> {
  const generatedAt = new Date().toISOString();
  const range = resolveRange(args.query);
  const marketRows = await projectMarketPositionAttribution({
    strategyScope: args.strategyScope,
    rangeStartUtc: range.start,
    rangeEndUtc: range.end
  });
  const filteredRows = marketRows.filter((row) => {
    if (args.query.strategy?.length && !args.query.strategy.includes(row.strategyId)) {
      return false;
    }

    return scopeAllows(args.strategyScope, row.strategyId);
  });

  const strategyMap = new Map<string, typeof filteredRows>();
  for (const row of filteredRows) {
    const current = strategyMap.get(row.strategyId) ?? [];
    current.push(row);
    strategyMap.set(row.strategyId, current);
  }

  const strategyBreakdown = aggregateRows(
    [...strategyMap.entries()].map(([strategyId, rows]) => ({
      scopeKey: strategyId,
      label: strategyId.toUpperCase(),
      realizedPnlNet: rows.reduce((sum, row) => sum + row.realizedPnlNet, 0),
      unrealizedPnlNet: rows.reduce((sum, row) => sum + row.unrealizedPnlNet, 0),
      feesTotal: rows.reduce((sum, row) => sum + row.feesTotal, 0),
      stale: rows.some((row) => row.stale),
      partial: rows.some((row) => row.partial),
      disagreement: rows.some((row) => row.disagreement),
      freshnessTimestamp: rows.map((row) => row.freshnessTimestamp).sort().at(-1) ?? generatedAt,
      metadata: {
        marketCount: rows.length
      }
    })),
    "strategy"
  );

  const symbolBreakdown = aggregateRows(
    [...strategyMap.entries()].map(([strategyId, rows]) => ({
      scopeKey: strategyId.toUpperCase(),
      label: strategyId.toUpperCase(),
      realizedPnlNet: rows.reduce((sum, row) => sum + row.realizedPnlNet, 0),
      unrealizedPnlNet: rows.reduce((sum, row) => sum + row.unrealizedPnlNet, 0),
      feesTotal: rows.reduce((sum, row) => sum + row.feesTotal, 0),
      stale: rows.some((row) => row.stale),
      partial: rows.some((row) => row.partial),
      disagreement: rows.some((row) => row.disagreement),
      freshnessTimestamp: rows.map((row) => row.freshnessTimestamp).sort().at(-1) ?? generatedAt,
      metadata: {
        strategyId
      }
    })),
    "symbol"
  );

  const marketBreakdown = aggregateRows(
    filteredRows.map((row) => ({
      scopeKey: row.marketTicker,
      label: row.marketTicker,
      realizedPnlNet: row.realizedPnlNet,
      unrealizedPnlNet: row.unrealizedPnlNet,
      feesTotal: row.feesTotal,
      stale: row.stale,
      partial: row.partial,
      disagreement: row.disagreement,
      freshnessTimestamp: row.freshnessTimestamp,
      metadata: row.metadata
    })),
    "market"
  );

  const portfolioSummary = aggregatePnlSummaries(
    strategyBreakdown.map((row) =>
      toSummaryCard({
        scopeType: "strategy",
        scopeKey: row.scopeKey,
        realizedPnlNet: row.realizedPnlNet,
        unrealizedPnlNet: row.unrealizedPnlNet,
        feesTotal: row.feesTotal,
        stale: row.stale,
        partial: row.partial,
        freshnessTimestamp: row.freshnessTimestamp ?? generatedAt,
        disagreementCount: row.disagreement ? 1 : 0
      })
    ),
    generatedAt
  );

  const compareTargets = args.query.compare?.length
    ? args.query.compare
    : args.query.strategy?.length
      ? args.query.strategy
      : strategyBreakdown.map((row) => row.scopeKey);

  return pnlSummaryResponseSchema.parse({
    generatedAt,
    bucket: normalizeBucket(args.query.bucket),
    rangeStartUtc: range.start,
    rangeEndUtc: range.end,
    portfolioSummary,
    strategyBreakdown,
    symbolBreakdown,
    marketBreakdown,
    compare: compareTargets
      .map((strategyId) => {
        const summary = strategyBreakdown.find((row) => row.scopeKey === strategyId);
        if (!summary) {
          return null;
        }

        return pnlCompareSeriesSchema.parse({
          strategyId,
          label: strategyId.toUpperCase(),
          summary,
          series: []
        });
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
  });
}

export async function projectPnlTimeseries(args: {
  readonly strategyScope: readonly string[];
  readonly query: PnlTimeseriesQuery;
}): Promise<PnlTimeseriesResponse> {
  const generatedAt = new Date().toISOString();
  const range = resolveRange(args.query);
  const marketRows = await projectMarketPositionAttribution({
    strategyScope: args.strategyScope,
    rangeStartUtc: range.start,
    rangeEndUtc: range.end
  });
  const relevantRows = marketRows.filter((row) =>
    args.query.strategy?.length ? args.query.strategy.includes(row.strategyId) : true
  );

  const trades = await query<{
    strategy_id: string | null;
    market_ticker: string;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }>(
    `
      select strategy_id, market_ticker, metadata, occurred_at::text as occurred_at
      from trades
      where occurred_at >= $1
        and occurred_at <= $2
      order by occurred_at asc
    `,
    [range.start, range.end]
  );

  const stepMs =
    args.query.granularity === "hour"
      ? 60 * 60 * 1000
      : args.query.granularity === "week"
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  const buckets: {
    readonly start: Date;
    readonly end: Date;
  }[] = [];
  for (
    let cursor = new Date(range.start).valueOf();
    cursor < new Date(range.end).valueOf();
    cursor += stepMs
  ) {
    buckets.push({
      start: new Date(cursor),
      end: new Date(Math.min(cursor + stepMs, new Date(range.end).valueOf()))
    });
  }

  const series = buckets.map(({ start, end }) => {
    const rows = trades.rows.filter((trade) => {
      const occurredAt = new Date(trade.occurred_at).valueOf();
      if (occurredAt < start.valueOf() || occurredAt > end.valueOf()) {
        return false;
      }

      if (!trade.strategy_id) {
        return false;
      }

      if (args.query.strategy?.length && !args.query.strategy.includes(trade.strategy_id)) {
        return false;
      }

      return scopeAllows(args.strategyScope, trade.strategy_id);
    });

    const realizedPnlNet = rows.reduce((sum, row) => {
      const realized = Number(
        row.metadata.realized_pnl ?? row.metadata.realizedPnl ?? row.metadata.cash_impact ?? 0
      );
      const fees = Number(
        row.metadata.feeAmount ?? row.metadata.fee_amount ?? row.metadata.fees ?? 0
      );
      return sum + realized - fees;
    }, 0);
    const feesTotal = rows.reduce(
      (sum, row) =>
        sum +
        Number(row.metadata.feeAmount ?? row.metadata.fee_amount ?? row.metadata.fees ?? 0),
      0
    );
    const bucketUnrealized = relevantRows.reduce((sum, row) => sum + row.unrealizedPnlNet, 0);

    return pnlTimeseriesPointSchema.parse({
      bucketStart: start.toISOString(),
      bucketEnd: end.toISOString(),
      realizedPnlNet,
      unrealizedPnlNet: bucketUnrealized,
      feesTotal,
      totalPnlNet: realizedPnlNet + bucketUnrealized,
      stale: relevantRows.some((row) => row.stale),
      partial: relevantRows.some((row) => row.partial)
    });
  });

  const attribution = relevantRows.map((row) =>
    pnlAttributionRowSchema.parse({
      scopeType: "market",
      scopeKey: row.marketTicker,
      label: row.marketTicker,
      realizedPnlNet: row.realizedPnlNet,
      unrealizedPnlNet: row.unrealizedPnlNet,
      feesTotal: row.feesTotal,
      totalPnlNet: row.totalPnlNet,
      stale: row.stale,
      partial: row.partial,
      disagreement: row.disagreement,
      freshnessTimestamp: row.freshnessTimestamp,
      metadata: row.metadata
    })
  );
  const compareTargets = args.query.compare?.length
    ? args.query.compare
    : [...new Set(relevantRows.map((row) => row.strategyId))];
  const compare = compareTargets
    .map((strategyId) => {
      const rows = relevantRows.filter((row) => row.strategyId === strategyId);
      if (rows.length === 0) {
        return null;
      }

      const summary = pnlAttributionRowSchema.parse({
        scopeType: "strategy",
        scopeKey: strategyId,
        label: strategyId.toUpperCase(),
        realizedPnlNet: rows.reduce((sum, row) => sum + row.realizedPnlNet, 0),
        unrealizedPnlNet: rows.reduce((sum, row) => sum + row.unrealizedPnlNet, 0),
        feesTotal: rows.reduce((sum, row) => sum + row.feesTotal, 0),
        totalPnlNet: rows.reduce((sum, row) => sum + row.totalPnlNet, 0),
        stale: rows.some((row) => row.stale),
        partial: rows.some((row) => row.partial),
        disagreement: rows.some((row) => row.disagreement),
        freshnessTimestamp: rows.map((row) => row.freshnessTimestamp).sort().at(-1),
        metadata: {
          marketCount: rows.length
        }
      });

      return pnlCompareSeriesSchema.parse({
        strategyId,
        label: strategyId.toUpperCase(),
        summary,
        series
      });
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  return pnlTimeseriesResponseSchema.parse({
    generatedAt,
    bucket: normalizeBucket(args.query.bucket),
    granularity: args.query.granularity,
    rangeStartUtc: range.start,
    rangeEndUtc: range.end,
    series,
    compare,
    attribution,
    winLossSummary: pnlWinLossSummarySchema.parse({
      wins: relevantRows.filter((row) => row.totalPnlNet > 0).length,
      losses: relevantRows.filter((row) => row.totalPnlNet < 0).length,
      winRate:
        relevantRows.length === 0
          ? 0
          : relevantRows.filter((row) => row.totalPnlNet > 0).length / relevantRows.length
    }),
    disagreementCount: relevantRows.filter((row) => row.disagreement).length
  });
}

export async function projectCurrentPortfolioPnl(args: {
  readonly strategyScope: readonly string[];
}) {
  return projectPnlSummary({
    strategyScope: args.strategyScope,
    query: {
      bucket: "24h",
      timezone: "utc"
    }
  });
}

export async function projectPnlStreamChanges(args: {
  readonly afterProjectionChangeId: number;
  readonly strategyScope: readonly string[];
}) {
  const result = await query<{
    projection_change_id: number;
    entity_id: string;
    effective_occurred_at: string;
    payload: Record<string, unknown>;
  }>(
    `
      select
        projection_change_id::int as projection_change_id,
        entity_id,
        effective_occurred_at::text as effective_occurred_at,
        payload
      from projection_changes
      where channel = 'pnl'
        and projection_change_id > $1
      order by projection_change_id asc
    `,
    [args.afterProjectionChangeId]
  );

  const summary = await projectCurrentPortfolioPnl({
    strategyScope: args.strategyScope
  });
  const strategySummaries = new Map(
    summary.strategyBreakdown.map((row) => [
      row.scopeKey,
      toSummaryCardFromAttribution({
        scopeType: "strategy",
        scopeKey: row.scopeKey,
        realizedPnlNet: row.realizedPnlNet,
        unrealizedPnlNet: row.unrealizedPnlNet,
        feesTotal: row.feesTotal,
        stale: row.stale,
        partial: row.partial,
        freshnessTimestamp: row.freshnessTimestamp,
        disagreement: row.disagreement
      })
    ])
  );

  return result.rows
    .map((row) => {
      const scopeType = String(row.payload.scopeType ?? "portfolio");
      const scopeKey = String(row.payload.scopeKey ?? "aggregate");
      if (scopeType === "strategy" && !scopeAllows(args.strategyScope, scopeKey)) {
        return null;
      }

      return {
        projectionChangeId: row.projection_change_id,
        effectiveOccurredAt: new Date(row.effective_occurred_at).toISOString(),
        scopeType,
        scopeKey,
        bucketType: String(row.payload.bucketType ?? "current"),
        summary:
          scopeType === "strategy"
            ? strategySummaries.get(scopeKey) ?? summary.portfolioSummary
            : summary.portfolioSummary
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
}
