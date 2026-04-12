import { describe, expect, test } from "vitest";

import {
  alertDetailResponseSchema,
  alertListResponseSchema,
  alertUpsertEventSchema,
  operationsResponseSchema,
  queueMetricUpsertEventSchema,
  systemHealthResponseSchema
} from "@kalshi-quant-dashboard/contracts";

describe("operations and alerts contracts", () => {
  test("parse operations snapshots, alert list rows, and system-health payloads", () => {
    const operations = operationsResponseSchema.parse({
      generatedAt: "2026-04-11T12:20:00Z",
      queueSummary: [
        {
          componentName: "rabbitmq",
          queueName: "kalshi.integration.executor",
          messageCount: 8,
          messagesReady: 8,
          messagesUnacknowledged: 0,
          consumerCount: 0,
          oldestMessageAgeSeconds: 45,
          dlqMessageCount: 0,
          dlqGrowthTotal: 0,
          reconnectStatus: "connected",
          sampledAt: "2026-04-11T12:20:00Z"
        }
      ],
      pipelineLatency: [
        {
          componentName: "publisher",
          phase: "publisher_to_executor",
          latencyMs: 45000,
          sampledAt: "2026-04-11T12:20:00Z"
        }
      ],
      componentStatus: [
        {
          componentName: "kalshi.integration.executor",
          status: "degraded",
          freshnessTimestamp: "2026-04-11T12:20:00Z",
          detail: "messages=8, consumers=0, dlq=0"
        }
      ],
      openAlertCount: 2,
      degraded: true
    });
    const alerts = alertListResponseSchema.parse({
      items: [
        {
          alertId: "queue-backlog:kalshi.integration.executor",
          alertType: "queue_backlog_age",
          severity: "warning",
          status: "open",
          summary: "Queue backlog age exceeded threshold",
          componentType: "pipeline",
          componentKey: "kalshi.integration.executor",
          latestSeenAt: "2026-04-11T12:20:00Z",
          detailPath: "/alerts/queue-backlog:kalshi.integration.executor"
        }
      ],
      pageInfo: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1
      }
    });
    const health = systemHealthResponseSchema.parse({
      generatedAt: "2026-04-11T12:20:00Z",
      overview: {
        status: "degraded",
        freshnessTimestamp: "2026-04-11T12:20:00Z",
        degraded: true
      },
      components: [
        {
          componentName: "kalshi.integration.executor",
          status: "degraded",
          freshnessTimestamp: "2026-04-11T12:20:00Z",
          detail: "messages=8, consumers=0, dlq=0"
        }
      ],
      degradedReasons: ["kalshi.integration.executor: messages=8, consumers=0, dlq=0"]
    });

    expect(operations.openAlertCount).toBe(2);
    expect(alerts.items[0]?.detailPath).toContain("/alerts/");
    expect(health.overview.degraded).toBe(true);
  });

  test("parse alert detail and live alert or queue payloads", () => {
    const detail = alertDetailResponseSchema.parse({
      summary: {
        alertId: "queue-backlog:kalshi.integration.executor",
        alertType: "queue_backlog_age",
        severity: "warning",
        status: "open",
        summary: "Queue backlog age exceeded threshold",
        componentType: "pipeline",
        componentKey: "kalshi.integration.executor",
        latestSeenAt: "2026-04-11T12:20:00Z",
        detailPath: "/alerts/queue-backlog:kalshi.integration.executor",
        correlationId: null,
        strategyId: null,
        firstSeenAt: "2026-04-11T12:20:00Z",
        detail: "Backlog age is above threshold.",
        affectedComponent: "kalshi.integration.executor",
        resolvedAt: null,
        metadata: {}
      },
      timeline: [],
      rawPayloadAvailable: false,
      auditEntries: []
    });
    const alertEvent = alertUpsertEventSchema.parse({
      projectionChangeId: 41,
      channel: "alerts",
      kind: "upsert",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:20:02Z",
      effectiveOccurredAt: "2026-04-11T12:20:00Z",
      payload: {
        alertId: "queue-backlog:kalshi.integration.executor",
        row: {
          alertId: "queue-backlog:kalshi.integration.executor",
          alertType: "queue_backlog_age",
          severity: "warning",
          status: "open",
          summary: "Queue backlog age exceeded threshold",
          componentType: "pipeline",
          componentKey: "kalshi.integration.executor",
          latestSeenAt: "2026-04-11T12:20:00Z",
          detailPath: "/alerts/queue-backlog:kalshi.integration.executor"
        }
      }
    });
    const queueEvent = queueMetricUpsertEventSchema.parse({
      projectionChangeId: 42,
      channel: "operations",
      kind: "upsert",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:20:02Z",
      effectiveOccurredAt: "2026-04-11T12:20:00Z",
      payload: {
        queueName: "kalshi.integration.executor",
        row: {
          componentName: "rabbitmq",
          queueName: "kalshi.integration.executor",
          messageCount: 8,
          messagesReady: 8,
          messagesUnacknowledged: 0,
          consumerCount: 0,
          oldestMessageAgeSeconds: 45,
          dlqMessageCount: 0,
          dlqGrowthTotal: 0,
          reconnectStatus: "connected",
          sampledAt: "2026-04-11T12:20:00Z"
        }
      }
    });

    expect(detail.summary.affectedComponent).toBe("kalshi.integration.executor");
    expect(alertEvent.payload.alertId).toContain("queue-backlog");
    expect(queueEvent.payload.row.consumerCount).toBe(0);
  });
});
