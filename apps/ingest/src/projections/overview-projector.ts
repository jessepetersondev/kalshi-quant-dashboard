import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";
import {
  alertRowSchema,
  overviewResponseSchema,
  pnlSummaryCardSchema,
  queueRowSchema,
  systemHealthSummarySchema,
  type AlertRow,
  type OverviewResponse,
  type PnlSummaryCard,
  type QueueRow,
  type SystemHealthSummary
} from "@kalshi-quant-dashboard/contracts";

import { projectLiveDecisionFeed } from "./live-decision-feed-projector.js";
import { projectLiveTradeFeed } from "./live-trade-feed-projector.js";

interface QueueMetricRow {
  readonly component_name: string;
  readonly queue_name: string;
  readonly message_count: number;
  readonly consumer_count: number;
  readonly oldest_message_age_ms: number;
  readonly dead_letter_size: number;
  readonly dead_letter_growth: number;
  readonly reconnecting: boolean;
  readonly occurred_at: string;
}

interface AlertProjectionRow {
  readonly alert_id: string;
  readonly alert_type: string;
  readonly severity: string;
  readonly status: string;
  readonly summary: string;
  readonly affected_component: string;
  readonly strategy_id: string | null;
  readonly last_seen_at: string;
}

interface PnlProjectionRow {
  readonly strategy_id: string | null;
  readonly realized_pnl: string;
  readonly unrealized_pnl: string;
  readonly fees: string;
  readonly stale: boolean;
  readonly partial: boolean;
  readonly occurred_at: string;
  readonly metadata: Record<string, unknown>;
}

function toIsoTimestamp(value: string | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function aggregatePnlSummaries(
  cards: readonly PnlSummaryCard[],
  generatedAt: string
): PnlSummaryCard {
  const latestFreshness = cards
    .map((card) => card.freshnessTimestamp)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return pnlSummaryCardSchema.parse({
    scopeType: "portfolio",
    scopeKey: "aggregate",
    realizedPnlNet: cards.reduce((sum, card) => sum + card.realizedPnlNet, 0),
    unrealizedPnlNet: cards.reduce((sum, card) => sum + card.unrealizedPnlNet, 0),
    feesTotal: cards.reduce((sum, card) => sum + card.feesTotal, 0),
    stale: cards.some((card) => card.stale),
    partial: cards.some((card) => card.partial),
    freshnessTimestamp: latestFreshness ?? generatedAt,
    disagreementCount: cards.reduce((sum, card) => sum + (card.disagreementCount ?? 0), 0)
  });
}

export function buildSystemHealthSummary(args: {
  readonly generatedAt: string;
  readonly latestFreshnessAt?: string | null;
  readonly openAlertCount: number;
  readonly reconnecting: boolean;
}): SystemHealthSummary {
  const freshnessTimestamp = args.latestFreshnessAt ?? args.generatedAt;
  const degraded = args.openAlertCount > 0 || args.reconnecting;

  return systemHealthSummarySchema.parse({
    status: degraded ? "degraded" : args.latestFreshnessAt ? "ok" : "unknown",
    freshnessTimestamp,
    degraded
  });
}

async function projectQueueSummary(): Promise<QueueRow[]> {
  const result = await query<QueueMetricRow>(
    `
      select distinct on (queue_name)
        component_name,
        queue_name,
        message_count,
        consumer_count,
        oldest_message_age_ms,
        dead_letter_size,
        dead_letter_growth,
        reconnecting,
        occurred_at::text as occurred_at
      from queue_metrics
      order by queue_name, occurred_at desc
    `
  );

  return result.rows.map((row) =>
    queueRowSchema.parse({
      componentName: row.component_name,
      queueName: row.queue_name,
      messageCount: row.message_count,
      messagesReady: row.message_count,
      messagesUnacknowledged: 0,
      consumerCount: row.consumer_count,
      oldestMessageAgeSeconds: row.oldest_message_age_ms / 1000,
      dlqMessageCount: row.dead_letter_size,
      dlqGrowthTotal: row.dead_letter_growth,
      reconnectStatus: row.reconnecting ? "reconnecting" : "connected",
      sampledAt: toIsoTimestamp(row.occurred_at)
    })
  );
}

export async function projectRecentAlerts(strategyScope: readonly string[]): Promise<AlertRow[]> {
  const result = await query<AlertProjectionRow>(
    `
      select
        alert_id,
        alert_type,
        severity,
        status,
        summary,
        affected_component,
        strategy_id,
        last_seen_at::text as last_seen_at
      from alerts
      order by last_seen_at desc
      limit 10
    `
  );

  return result.rows
    .filter(
      (row) =>
        row.strategy_id === null ||
        scopeAllows(strategyScope, row.strategy_id)
    )
    .map((row) =>
      alertRowSchema.parse({
        alertId: row.alert_id,
        alertType: row.alert_type,
        severity: row.severity,
        status: row.status,
        summary: row.summary,
        componentType: row.strategy_id ? "strategy" : "pipeline",
        componentKey: row.strategy_id ?? row.affected_component,
        latestSeenAt: toIsoTimestamp(row.last_seen_at),
        detailPath: `/alerts/${row.alert_id}`
      })
    );
}

async function projectAggregatePnl(
  strategyScope: readonly string[],
  generatedAt: string
): Promise<PnlSummaryCard> {
  const result = await query<PnlProjectionRow>(
    `
      select distinct on (strategy_id)
        strategy_id,
        realized_pnl::text as realized_pnl,
        unrealized_pnl::text as unrealized_pnl,
        fees::text as fees,
        stale,
        partial,
        occurred_at::text as occurred_at,
        metadata
      from pnl_snapshots
      where bucket_type = 'current'
      order by strategy_id, occurred_at desc
    `
  );

  const cards = result.rows
    .filter((row) => row.strategy_id && scopeAllows(strategyScope, row.strategy_id))
    .map((row) =>
      pnlSummaryCardSchema.parse({
        scopeType: "strategy",
        scopeKey: row.strategy_id,
        realizedPnlNet: Number(row.realized_pnl),
        unrealizedPnlNet: Number(row.unrealized_pnl),
        feesTotal: Number(row.fees),
        stale: row.stale,
        partial: row.partial,
        freshnessTimestamp: toIsoTimestamp(row.occurred_at),
        disagreementCount: Number(row.metadata.disagreementCount ?? 0)
      })
    );

  if (cards.length === 0) {
    return pnlSummaryCardSchema.parse({
      scopeType: "portfolio",
      scopeKey: "aggregate",
      realizedPnlNet: 0,
      unrealizedPnlNet: 0,
      feesTotal: 0,
      stale: false,
      partial: false,
      freshnessTimestamp: generatedAt,
      disagreementCount: 0
    });
  }

  return aggregatePnlSummaries(cards, generatedAt);
}

export async function projectLatestProjectionChangeId(): Promise<number> {
  const result = await query<{ projection_change_id: number }>(
    `
      select coalesce(max(projection_change_id), 0)::int as projection_change_id
      from projection_changes
    `
  );

  return result.rows[0]?.projection_change_id ?? 0;
}

export async function projectOverviewSnapshot(args: {
  readonly strategyScope: readonly string[];
  readonly generatedAt?: string;
}): Promise<OverviewResponse> {
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const [liveDecisionFeed, liveTradeFeed, queueSummary, recentAlerts, aggregatePnl] =
    await Promise.all([
      projectLiveDecisionFeed({ strategyScope: args.strategyScope }),
      projectLiveTradeFeed({ strategyScope: args.strategyScope }),
      projectQueueSummary(),
      projectRecentAlerts(args.strategyScope),
      projectAggregatePnl(args.strategyScope, generatedAt)
    ]);

  const freshnessCandidates = [
    aggregatePnl.freshnessTimestamp,
    queueSummary[0]?.sampledAt,
    liveTradeFeed[0]?.latestSeenAt,
    liveDecisionFeed[0]?.latestEventAt,
    recentAlerts[0]?.latestSeenAt
  ].filter((value): value is string => Boolean(value));
  const healthSummary = buildSystemHealthSummary({
    generatedAt,
    latestFreshnessAt: freshnessCandidates.sort().at(-1) ?? null,
    openAlertCount: recentAlerts.filter((alert) => alert.status === "open").length,
    reconnecting: queueSummary.some((queue) => queue.reconnectStatus === "reconnecting")
  });

  return overviewResponseSchema.parse({
    generatedAt,
    healthSummary,
    aggregatePnl,
    liveDecisionFeed,
    liveTradeFeed,
    queueSummary,
    recentAlerts
  });
}
