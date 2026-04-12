import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  strategySummarySchema,
  type StrategySummary
} from "@kalshi-quant-dashboard/contracts";

const STALE_STRATEGY_MS = 15 * 60 * 1000;

interface StrategySummaryRow {
  readonly strategy_id: string;
  readonly display_name: string;
  readonly symbol: string;
  readonly source_path_mode: "publisher_only" | "direct_only" | "hybrid";
  readonly latest_heartbeat_at: string | null;
  readonly latest_pnl_snapshot_at: string | null;
  readonly open_alert_count: string;
}

function toIsoTimestamp(value: string | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export interface SourcePathBadge {
  readonly label: "Direct" | "Hybrid" | "Publisher";
  readonly tone: "direct" | "hybrid" | "publisher";
}

export function getSourcePathBadge(
  sourcePathMode: "publisher_only" | "direct_only" | "hybrid"
): SourcePathBadge {
  if (sourcePathMode === "direct_only") {
    return { label: "Direct", tone: "direct" };
  }

  if (sourcePathMode === "hybrid") {
    return { label: "Hybrid", tone: "hybrid" };
  }

  return { label: "Publisher", tone: "publisher" };
}

export function deriveStrategyHealthStatus(args: {
  readonly generatedAt: string;
  readonly latestHeartbeatAt?: string | null;
  readonly latestPnlSnapshotAt?: string | null;
  readonly openAlertCount?: number;
}): string {
  if ((args.openAlertCount ?? 0) > 0) {
    return "degraded";
  }

  const freshnessCandidates = [args.latestHeartbeatAt, args.latestPnlSnapshotAt].filter(
    (value): value is string => Boolean(value)
  );
  if (freshnessCandidates.length === 0) {
    return "unknown";
  }

  const freshest = freshnessCandidates
    .map((value) => new Date(value).valueOf())
    .reduce((max, value) => Math.max(max, value), 0);

  return new Date(args.generatedAt).valueOf() - freshest > STALE_STRATEGY_MS
    ? "degraded"
    : "ok";
}

export async function projectStrategySummaries(args: {
  readonly strategyScope: readonly string[];
  readonly generatedAt?: string;
}): Promise<StrategySummary[]> {
  const result = await query<StrategySummaryRow>(
    `
      select
        strategies.strategy_id,
        strategies.display_name,
        strategies.symbol,
        strategies.source_path_mode,
        heartbeat.latest_heartbeat_at::text as latest_heartbeat_at,
        pnl.latest_pnl_snapshot_at::text as latest_pnl_snapshot_at,
        coalesce(alerts.open_alert_count, 0)::text as open_alert_count
      from strategies
      left join lateral (
        select occurred_at as latest_heartbeat_at
        from heartbeats
        where heartbeats.strategy_id = strategies.strategy_id
        order by occurred_at desc
        limit 1
      ) heartbeat on true
      left join lateral (
        select occurred_at as latest_pnl_snapshot_at
        from pnl_snapshots
        where pnl_snapshots.strategy_id = strategies.strategy_id
        order by occurred_at desc
        limit 1
      ) pnl on true
      left join lateral (
        select count(*) as open_alert_count
        from alerts
        where alerts.strategy_id = strategies.strategy_id
          and alerts.status in ('open', 'acknowledged')
      ) alerts on true
      where strategies.enabled = true
      order by strategies.strategy_id asc
    `
  );
  const generatedAt = args.generatedAt ?? new Date().toISOString();

  return result.rows
    .filter((row) => scopeAllows(args.strategyScope, row.strategy_id))
    .map((row) =>
      strategySummarySchema.parse({
        strategyId: row.strategy_id,
        displayName: row.display_name,
        symbol: row.symbol,
        sourcePathMode: row.source_path_mode,
        healthStatus: deriveStrategyHealthStatus({
          generatedAt,
          latestHeartbeatAt: toIsoTimestamp(row.latest_heartbeat_at),
          latestPnlSnapshotAt: toIsoTimestamp(row.latest_pnl_snapshot_at),
          openAlertCount: Number(row.open_alert_count)
        }),
        latestHeartbeatAt: toIsoTimestamp(row.latest_heartbeat_at),
        latestPnlSnapshotAt: toIsoTimestamp(row.latest_pnl_snapshot_at)
      })
    );
}

export async function projectStrategySummary(args: {
  readonly strategyId: string;
  readonly strategyScope: readonly string[];
  readonly generatedAt?: string;
}): Promise<StrategySummary | null> {
  const summaries = await projectStrategySummaries(
    args.generatedAt
      ? {
          strategyScope: args.strategyScope,
          generatedAt: args.generatedAt
        }
      : {
          strategyScope: args.strategyScope
        }
  );

  return summaries.find((summary) => summary.strategyId === args.strategyId) ?? null;
}
