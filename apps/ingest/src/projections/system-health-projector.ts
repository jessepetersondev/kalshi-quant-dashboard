import {
  operationsResponseSchema,
  systemHealthResponseSchema
} from "@kalshi-quant-dashboard/contracts";

import { projectRecentAlerts } from "./overview-projector.js";
import { buildSystemHealthSummary } from "./overview-projector.js";
import { projectHeartbeatStatuses } from "./heartbeat-projector.js";
import { projectQueueMetricRows } from "./queue-metric-projector.js";

export async function projectOperationsSnapshot(args: {
  readonly strategyScope: readonly string[];
}) {
  const generatedAt = new Date().toISOString();
  const [queueSummary, heartbeats, alerts] = await Promise.all([
    projectQueueMetricRows(),
    projectHeartbeatStatuses({ strategyScope: args.strategyScope }),
    projectRecentAlerts(args.strategyScope)
  ]);

  const componentStatus = [
    ...heartbeats,
    ...queueSummary.map((row) => ({
      componentName: row.queueName,
      status:
        row.reconnectStatus === "reconnecting" ||
        (row.oldestMessageAgeSeconds ?? 0) > 30 ||
        row.consumerCount === 0
          ? "degraded"
          : "ok",
      freshnessTimestamp: row.sampledAt,
      detail: `messages=${row.messageCount}, consumers=${row.consumerCount}, dlq=${row.dlqMessageCount ?? 0}`
    }))
  ];

  return operationsResponseSchema.parse({
    generatedAt,
    queueSummary,
    pipelineLatency: [
      {
        componentName: "publisher",
        phase: "publisher_to_executor",
        latencyMs:
          queueSummary.reduce((sum, row) => sum + (row.oldestMessageAgeSeconds ?? 0) * 1000, 0) /
          Math.max(queueSummary.length, 1),
        sampledAt: generatedAt
      }
    ],
    componentStatus,
    openAlertCount: alerts.filter((row) => row.status === "open").length,
    degraded: componentStatus.some((row) => row.status !== "ok")
  });
}

export async function projectSystemHealth(args: {
  readonly strategyScope: readonly string[];
}) {
  const generatedAt = new Date().toISOString();
  const [operations, alerts] = await Promise.all([
    projectOperationsSnapshot(args),
    projectRecentAlerts(args.strategyScope)
  ]);
  const freshnessCandidates = [
    ...operations.queueSummary.map((row) => row.sampledAt),
    ...operations.componentStatus.map((row) => row.freshnessTimestamp ?? undefined)
  ].filter((value): value is string => Boolean(value));
  const overview = buildSystemHealthSummary({
    generatedAt,
    latestFreshnessAt: freshnessCandidates.sort().at(-1) ?? generatedAt,
    openAlertCount: alerts.filter((row) => row.status === "open").length,
    reconnecting: operations.queueSummary.some(
      (row) => row.reconnectStatus === "reconnecting"
    )
  });

  return systemHealthResponseSchema.parse({
    generatedAt,
    overview,
    components: operations.componentStatus,
    degradedReasons: operations.componentStatus
      .filter((row) => row.status !== "ok")
      .map((row) => `${row.componentName}: ${row.detail}`)
  });
}
