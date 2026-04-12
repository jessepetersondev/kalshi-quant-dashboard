import { readFileSync } from "node:fs";
import { join } from "node:path";

import { load as loadYaml } from "js-yaml";
import { describe, expect, test } from "vitest";

import {
  alertUpsertEventSchema,
  decisionUpsertEventSchema,
  liveSubscriptionAuthorizationSchema,
  liveSubscriptionRequestSchema,
  overviewSnapshotEventSchema,
  pnlUpsertEventSchema,
  queueMetricUpsertEventSchema,
  skipUpsertEventSchema,
  streamGapEventSchema,
  streamResyncRequiredEventSchema,
  streamStatusEventSchema,
  tradeUpsertEventSchema
} from "@kalshi-quant-dashboard/contracts";

function readArtifact(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function readYamlArtifact(relativePath: string): Record<string, unknown> {
  return loadYaml(readArtifact(relativePath)) as Record<string, unknown>;
}

function collectRefs(value: unknown, refs: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, refs);
    }
    return refs;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (key === "$ref" && typeof nested === "string") {
        refs.push(nested);
        continue;
      }

      collectRefs(nested, refs);
    }
  }

  return refs;
}

function resolveJsonPointer(document: Record<string, unknown>, pointer: string): unknown {
  const segments = pointer
    .replace(/^#\//, "")
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = document;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function extractDocumentedEventNames(document: Record<string, unknown>): string[] {
  const events = Array.isArray(document.events) ? document.events : [];
  return events
    .map((item) =>
      item && typeof item === "object" && typeof item.name === "string" ? item.name : null
    )
    .filter((value): value is string => value !== null);
}

function extractServerEventNames(source: string): string[] {
  return [...new Set([...source.matchAll(/event: ([a-z_.]+)/g)].map((match) => match[1] ?? ""))];
}

function extractClientEventNames(source: string): string[] {
  return [
    ...new Set(
      [...source.matchAll(/addEventListener\("([^"]+)"/g)].map((match) => match[1] ?? "")
    )
  ];
}

describe("live stream contracts", () => {
  test("parses subscription requests and authorization envelopes", () => {
    expect(
      liveSubscriptionRequestSchema.parse({
        channels: ["overview", "decisions", "skips", "alerts"],
        strategy: ["btc", "eth"],
        compare: ["btc"],
        timezone: "utc",
        detailLevel: "standard"
      })
    ).toMatchObject({
      channels: ["overview", "decisions", "skips", "alerts"],
      strategy: ["btc", "eth"],
      compare: ["btc"]
    });

    expect(
      liveSubscriptionAuthorizationSchema.parse({
        allowed: true,
        filteredChannels: ["overview", "alerts"],
        detailLevel: "standard"
      })
    ).toMatchObject({
      allowed: true,
      filteredChannels: ["overview", "alerts"]
    });
  });

  test("parses overview, lifecycle, analytics, and alert stream payloads", () => {
    const emittedAt = "2026-04-11T12:15:00.000Z";
    const effectiveOccurredAt = "2026-04-11T12:14:00.000Z";

    expect(
      overviewSnapshotEventSchema.parse({
        projectionChangeId: 41,
        channel: "overview",
        kind: "snapshot",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          generatedAt: emittedAt,
          healthSummary: {
            status: "ok",
            freshnessTimestamp: emittedAt,
            degraded: false
          },
          aggregatePnl: {
            scopeType: "portfolio",
            scopeKey: "all",
            realizedPnlNet: 18.2,
            unrealizedPnlNet: 4.5,
            feesTotal: 1.2,
            stale: false,
            partial: false,
            freshnessTimestamp: emittedAt,
            disagreementCount: 0
          },
          liveDecisionFeed: [],
          liveTradeFeed: [],
          queueSummary: [],
          recentAlerts: []
        }
      })
    ).toBeTruthy();

    expect(
      streamStatusEventSchema.parse({
        projectionChangeId: 42,
        channel: "overview",
        kind: "status",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          connectionState: "connected",
          freshnessTimestamp: emittedAt,
          degraded: false,
          reconciliationPending: false
        }
      })
    ).toBeTruthy();

    expect(
      decisionUpsertEventSchema.parse({
        projectionChangeId: 43,
        channel: "decisions",
        kind: "upsert",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          correlationId: "btc:decision:1",
          row: {
            correlationId: "btc:decision:1",
            strategyId: "btc",
            symbol: "BTC",
            marketTicker: "KXBTCD-APR",
            decisionAction: "buy",
            reasonSummary: "edge passed",
            currentLifecycleStage: "submission",
            currentOutcomeStatus: "emitted",
            latestEventAt: emittedAt,
            sourcePathMode: "hybrid",
            degraded: false
          }
        }
      })
    ).toBeTruthy();

    expect(
      tradeUpsertEventSchema.parse({
        projectionChangeId: 44,
        channel: "trades",
        kind: "upsert",
        detailLevel: "debug",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          correlationId: "btc:trade:1",
          row: {
            correlationId: "btc:trade:1",
            tradeAttemptKey: "trade-1",
            strategyId: "btc",
            symbol: "BTC",
            marketTicker: "KXBTCD-APR",
            status: "submitted",
            publishStatus: "published",
            lastResultStatus: null,
            latestSeenAt: emittedAt,
            sourcePathMode: "hybrid",
            degraded: false
          },
          debug: {
            replayKind: "live"
          }
        }
      })
    ).toBeTruthy();

    expect(
      skipUpsertEventSchema.parse({
        projectionChangeId: 45,
        channel: "skips",
        kind: "upsert",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          correlationId: "btc:skip:1",
          row: {
            correlationId: "btc:skip:1",
            strategyId: "btc",
            symbol: "BTC",
            marketTicker: "KXBTCD-SKIP-ONLY",
            skipCategory: "timing_window",
            skipCode: "cooldown_active",
            reasonRaw: "cooldown still active",
            occurredAt: effectiveOccurredAt
          }
        }
      })
    ).toBeTruthy();

    expect(
      pnlUpsertEventSchema.parse({
        projectionChangeId: 46,
        channel: "pnl",
        kind: "upsert",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          scopeType: "strategy",
          scopeKey: "btc",
          bucketType: "24h",
          summary: {
            scopeType: "strategy",
            scopeKey: "btc",
            realizedPnlNet: 12.4,
            unrealizedPnlNet: 3.1,
            feesTotal: 0.8,
            stale: false,
            partial: false,
            freshnessTimestamp: emittedAt,
            disagreementCount: 0
          }
        }
      })
    ).toBeTruthy();

    expect(
      queueMetricUpsertEventSchema.parse({
        projectionChangeId: 47,
        channel: "operations",
        kind: "upsert",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          queueName: "kalshi.integration.executor",
          row: {
            componentName: "executor",
            queueName: "kalshi.integration.executor",
            messageCount: 3,
            consumerCount: 2,
            oldestMessageAgeSeconds: 14,
            dlqMessageCount: 0,
            reconnectStatus: "connected",
            sampledAt: emittedAt
          }
        }
      })
    ).toBeTruthy();

    expect(
      alertUpsertEventSchema.parse({
        projectionChangeId: 48,
        channel: "alerts",
        kind: "upsert",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          alertId: "alert-1",
          row: {
            alertId: "alert-1",
            alertType: "queue_backlog_age",
            severity: "warning",
            status: "open",
            summary: "Queue backlog age exceeded threshold",
            componentType: "pipeline",
            componentKey: "kalshi.integration.executor",
            latestSeenAt: emittedAt,
            detailPath: "/alerts/alert-1"
          }
        }
      })
    ).toBeTruthy();

    expect(
      streamGapEventSchema.parse({
        projectionChangeId: 49,
        channel: "overview",
        kind: "gap",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          gapType: "history_mismatch",
          affectedChannels: ["skips", "trades"],
          detectedAt: emittedAt,
          message: "History mismatch detected for replayed skip events.",
          correlationId: "btc:skip:1",
          strategyId: "btc"
        }
      })
    ).toBeTruthy();

    expect(
      streamResyncRequiredEventSchema.parse({
        projectionChangeId: 50,
        channel: "overview",
        kind: "resync_required",
        detailLevel: "standard",
        emittedAt,
        effectiveOccurredAt,
        payload: {
          reason: "Last-Event-ID is older than the retained stream window.",
          affectedChannels: ["alerts"],
          refetch: true,
          cursorStart: 42
        }
      })
    ).toBeTruthy();
  });

  test("keep YAML contracts, runtime schemas, SSE emitter, and client listeners aligned", () => {
    const liveUpdates = readYamlArtifact(
      "specs/001-quant-ops-dashboard/contracts/live-updates.yaml"
    );
    const openApi = readYamlArtifact(
      "specs/001-quant-ops-dashboard/contracts/rest-api.openapi.yaml"
    );
    const serverSource = readArtifact("apps/api/src/plugins/sse.ts");
    const clientSource = readArtifact("apps/web/src/features/live/streamClient.ts");
    const documentedEventNames = extractDocumentedEventNames(liveUpdates).sort();
    const schemaEventNames = [
      "overview.snapshot",
      "decision.upsert",
      "trade.upsert",
      "skip.upsert",
      "pnl.upsert",
      "queue_metric.upsert",
      "alert.upsert",
      "stream.status",
      "stream.gap",
      "stream.resync_required"
    ].sort();
    const requiredServerEvents = [
      "overview.snapshot",
      "decision.upsert",
      "trade.upsert",
      "skip.upsert",
      "pnl.upsert",
      "queue_metric.upsert",
      "alert.upsert",
      "stream.status",
      "stream.gap",
      "stream.resync_required"
    ].sort();
    const requiredClientEvents = [
      "overview.snapshot",
      "decision.upsert",
      "trade.upsert",
      "skip.upsert",
      "pnl.upsert",
      "queue_metric.upsert",
      "alert.upsert",
      "stream.status",
      "stream.gap",
      "stream.resync_required"
    ].sort();
    const refs = collectRefs(liveUpdates);

    expect(
      liveSubscriptionRequestSchema.parse({
        channels: ["overview", "decisions", "trades", "skips", "pnl", "operations", "alerts"],
        strategy: ["btc"],
        compare: ["btc", "eth"],
        timezone: "utc",
        detailLevel: "debug"
      })
    ).toBeTruthy();
    expect(documentedEventNames).toEqual(schemaEventNames);

    for (const ref of refs) {
      if (!ref.startsWith("./rest-api.openapi.yaml#/")) {
        continue;
      }

      const pointer = ref.slice("./rest-api.openapi.yaml".length);
      expect(resolveJsonPointer(openApi, pointer)).toBeTruthy();
    }

    expect(extractServerEventNames(serverSource).sort()).toEqual(requiredServerEvents);
    expect(extractClientEventNames(clientSource).sort()).toEqual(requiredClientEvents);
  });
});
