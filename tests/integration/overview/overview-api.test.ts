import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { query } from "@kalshi-quant-dashboard/db";
import { sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";
import {
  bootstrapTestDatabase,
  loadFixture,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import {
  overviewResponseSchema,
  overviewSnapshotEventSchema,
  streamStatusEventSchema,
  strategyDetailResponseSchema
} from "@kalshi-quant-dashboard/contracts";

import { buildApp } from "../../../apps/api/src/app.js";
import { SourceIngestService } from "../../../apps/ingest/src/services/source-ingest-service.js";

function extractEventPayload(body: string, eventName: string): unknown {
  const blocks = body.trim().split("\n\n");
  const block = blocks.find((entry) => entry.includes(`event: ${eventName}`));
  const dataLine = block?.split("\n").find((line) => line.startsWith("data: "));
  if (!dataLine) {
    throw new Error(`Missing SSE event '${eventName}'.`);
  }

  return JSON.parse(dataLine.slice("data: ".length)) as unknown;
}

async function seedOverviewFacts(): Promise<void> {
  const sourceIngestService = new SourceIngestService();

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantStatusV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: await loadFixture("strategies/eth-status.json")
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantDashboardLiveV1,
    sourceRepo: "kalshi-btc-quant",
    strategyId: "btc",
    payload: await loadFixture("strategies/btc-dashboard-live.json")
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantNoTradeDiagnosticsV1,
    sourceRepo: "kalshi-sol-quant",
    strategyId: "sol",
    payload: await loadFixture("strategies/sol-no-trade-diagnostics.json")
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.publisherEnvelopeV1,
    sourceRepo: "kalshi-integration-event-publisher",
    payload: await loadFixture("publisher/order-created.json"),
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.created",
      deliveryTag: 11,
      sourceDeliveryOrdinal: 1
    }
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.publisherResultV1,
    sourceRepo: "kalshi-integration-executor",
    payload: await loadFixture("publisher/order-execution-succeeded.json"),
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.execution_succeeded",
      deliveryTag: 12,
      sourceDeliveryOrdinal: 2
    }
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.rabbitMqManagementV1,
    sourceRepo: "rabbitmq-management",
    payload: await loadFixture("rabbitmq/queue-metric.json")
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantPnlV1,
    sourceRepo: "kalshi-xrp-quant",
    strategyId: "xrp",
    payload: await loadFixture("strategies/xrp-pnl.json")
  });

  await query(
    `
        insert into alerts (
        alert_id,
        correlation_id,
        strategy_id,
        alert_type,
        severity,
        status,
        source_canonical_event_id,
        summary,
        detail,
        affected_component,
        metadata,
        first_seen_at,
        last_seen_at,
        resolved_at
      )
      values (
        'alert-overview-1',
        null,
        'btc',
        'queue_backlog_age',
        'warning',
        'open',
        null,
        'Executor queue age exceeded threshold',
        'Backlog age is above threshold',
        'kalshi.integration.executor',
        '{}'::jsonb,
        '2026-04-11T12:00:05Z',
        '2026-04-11T12:00:05Z',
        null
      )
      on conflict (alert_id) do update
      set summary = excluded.summary,
          detail = excluded.detail,
          last_seen_at = excluded.last_seen_at,
          status = excluded.status
    `
  );
}

describe.sequential("overview api", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
    app.capabilityCache.invalidate();
  });

  test("return mixed-source overview data, strategy detail, and standard SSE overview snapshots", async () => {
    await seedOverviewFacts();

    const overviewResponse = await app.inject({
      method: "GET",
      url: "/api/overview",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });

    expect(overviewResponse.statusCode).toBe(200);
    const overview = overviewResponseSchema.parse(overviewResponse.json());
    expect(overview.liveDecisionFeed.some((row) => row.strategyId === "eth")).toBe(true);
    expect(overview.liveDecisionFeed.some((row) => row.sourcePathMode === "hybrid")).toBe(
      true
    );
    expect(overview.liveTradeFeed.some((row) => row.strategyId === "btc")).toBe(true);
    expect(overview.queueSummary[0]?.queueName).toBe("kalshi.integration.executor");
    expect(overview.recentAlerts[0]?.detailPath).toBe("/alerts/alert-overview-1");

    const strategyResponse = await app.inject({
      method: "GET",
      url: "/api/strategies/btc",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });

    expect(strategyResponse.statusCode).toBe(200);
    const strategyDetail = strategyDetailResponseSchema.parse(strategyResponse.json());
    expect(strategyDetail.strategy.strategyId).toBe("btc");
    expect(strategyDetail.recentTrades.some((row) => row.tradeAttemptKey.length > 0)).toBe(
      true
    );
    expect(strategyDetail.recentSkips.length).toBeGreaterThan(0);

    const streamResponse = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=overview",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });

    expect(streamResponse.statusCode).toBe(200);
    expect(streamResponse.body).toContain("event: overview.snapshot");
    expect(streamResponse.body).toContain("event: stream.status");
    overviewSnapshotEventSchema.parse(extractEventPayload(streamResponse.body, "overview.snapshot"));
    streamStatusEventSchema.parse(extractEventPayload(streamResponse.body, "stream.status"));
  });

  test("deny out-of-scope strategy detail and debug live subscriptions", async () => {
    await query(
      `
        insert into users (user_id, email, display_name, default_role)
        values ('user-btc-only', 'btc-only@example.internal', 'BTC Only', 'operator')
        on conflict (user_id) do update
        set email = excluded.email,
            display_name = excluded.display_name,
            default_role = excluded.default_role,
            updated_at = now()
      `
    );
    await query(
      `
        insert into role_bindings (role_binding_id, user_id, role, strategy_scope, active)
        values (
          'binding-user-btc-only',
          'user-btc-only',
          'operator',
          '["btc"]'::jsonb,
          true
        )
        on conflict (role_binding_id) do update
        set role = excluded.role,
            strategy_scope = excluded.strategy_scope,
            active = excluded.active,
            updated_at = now()
      `
    );
    app.capabilityCache.invalidate("btc-only@example.internal");

    const strategyResponse = await app.inject({
      method: "GET",
      url: "/api/strategies/eth",
      headers: {
        "x-dashboard-user": "btc-only@example.internal"
      }
    });
    const debugStreamResponse = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=overview&detailLevel=debug",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });

    expect(strategyResponse.statusCode).toBe(403);
    expect(debugStreamResponse.statusCode).toBe(403);
  });
});
