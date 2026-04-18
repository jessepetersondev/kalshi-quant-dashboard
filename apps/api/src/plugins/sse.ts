import type { FastifyInstance } from "fastify";

import {
  alertUpsertEventSchema,
  apiErrorSchema,
  decisionUpsertEventSchema,
  liveSubscriptionRequestSchema,
  overviewSnapshotEventSchema,
  pnlUpsertEventSchema,
  queueMetricUpsertEventSchema,
  skipUpsertEventSchema,
  streamGapEventSchema,
  streamResyncRequiredEventSchema,
  streamStatusEventSchema,
  tradeUpsertEventSchema,
} from "@kalshi-quant-dashboard/contracts";
import { query } from "@kalshi-quant-dashboard/db";

import { requireSessionContext } from "../auth/session-context.js";
import { OverviewService } from "../services/overview-service.js";
import { DecisionService } from "../services/decision-service.js";
import { TradeService } from "../services/trade-service.js";
import { AlertService } from "../services/alert-service.js";
import { LiveSubscriptionService } from "../services/live-subscription-service.js";
import { projectAlertStreamChanges } from "../../../ingest/src/projections/alert-projector.js";
import { projectDecisionStreamChanges } from "../../../ingest/src/projections/decision-lifecycle-projector.js";
import { projectPnlStreamChanges } from "../../../ingest/src/projections/pnl-snapshot-projector.js";
import { projectQueueMetricStreamChanges } from "../../../ingest/src/projections/queue-metric-projector.js";
import { projectSkipStreamChanges } from "../../../ingest/src/projections/skip-event-projector.js";
import { projectTradeStreamChanges } from "../../../ingest/src/projections/trade-attempt-projector.js";

const SSE_HEARTBEAT_INTERVAL_MS = 15_000;
const SSE_POLL_INTERVAL_MS = 1_000;
const MAX_STREAM_BACKFILL_CHANGES = 500;

function normalizeArrayQuery(value: unknown): string[] | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) =>
        typeof entry === "string"
          ? entry.split(",").map((part) => part.trim())
          : []
      )
      .filter(Boolean);
  }

  return undefined;
}

function normalizeRequestedStrategies(args: {
  readonly strategy?: readonly string[] | undefined;
  readonly compare?: readonly string[] | undefined;
}): string[] | undefined {
  const values = [...(args.strategy ?? []), ...(args.compare ?? [])]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return values.length > 0 ? [...new Set(values)] : undefined;
}

function baseStreamEnvelope(args: {
  readonly projectionChangeId: number;
  readonly detailLevel: "standard" | "debug";
  readonly emittedAt: string;
  readonly effectiveOccurredAt?: string | null;
}) {
  return {
    projectionChangeId: args.projectionChangeId,
    detailLevel: args.detailLevel,
    emittedAt: args.emittedAt,
    effectiveOccurredAt: args.effectiveOccurredAt ?? null,
  };
}

function defaultAffectedChannels(gapType: string): string[] {
  if (gapType === "missing_terminal_event") {
    return ["trades"];
  }

  if (gapType === "stream_history_mismatch") {
    return ["decisions", "trades", "skips", "alerts", "operations", "pnl"];
  }

  return ["overview"];
}

async function readProjectionWindow(channels: readonly string[]) {
  if (channels.length === 0) {
    return { earliestProjectionChangeId: 0, latestProjectionChangeId: 0 };
  }

  const result = await query<{
    earliest_projection_change_id: number;
    latest_projection_change_id: number;
  }>(
    `
      select
        coalesce(min(projection_change_id), 0)::int as earliest_projection_change_id,
        coalesce(max(projection_change_id), 0)::int as latest_projection_change_id
      from projection_changes
      where channel = any($1::text[])
    `,
    [channels]
  );

  return {
    earliestProjectionChangeId:
      result.rows[0]?.earliest_projection_change_id ?? 0,
    latestProjectionChangeId: result.rows[0]?.latest_projection_change_id ?? 0,
  };
}

async function readGapEvents(args: {
  readonly strategyScope: readonly string[];
  readonly filteredChannels: readonly string[];
  readonly detailLevel: "standard" | "debug";
  readonly emittedAt: string;
  readonly projectionChangeId: number;
}) {
  const result = await query<{
    gap_id: string;
    correlation_id: string;
    strategy_id: string | null;
    gap_type: string;
    detected_at: string;
    details: Record<string, unknown>;
  }>(
    `
      select
        gap_id,
        correlation_id,
        strategy_id,
        gap_type,
        detected_at::text as detected_at,
        details
      from reconciliation_gaps
      where status = 'gap_detected'
        and (strategy_id is null or strategy_id = any($1::text[]))
      order by detected_at asc, gap_id asc
    `,
    [args.strategyScope]
  );

  return result.rows
    .map((row) => {
      const detailChannels = Array.isArray(row.details?.affectedChannels)
        ? row.details.affectedChannels.filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0
          )
        : defaultAffectedChannels(row.gap_type);
      const affectedChannels = detailChannels.filter((channel) =>
        args.filteredChannels.includes(channel)
      );
      if (affectedChannels.length === 0) {
        return null;
      }

      return streamGapEventSchema.parse({
        ...baseStreamEnvelope({
          projectionChangeId: args.projectionChangeId,
          detailLevel: args.detailLevel,
          emittedAt: args.emittedAt,
          effectiveOccurredAt: new Date(row.detected_at).toISOString(),
        }),
        channel: "overview",
        kind: "gap",
        payload: {
          gapType:
            row.gap_type === "stream_history_mismatch"
              ? "history_mismatch"
              : row.gap_type === "missing_terminal_event"
                ? "missing_terminal_event"
                : row.gap_type === "backfill_pending"
                  ? "backfill_pending"
                  : "resync_required",
          affectedChannels,
          detectedAt: new Date(row.detected_at).toISOString(),
          message:
            typeof row.details?.message === "string" &&
            row.details.message.length > 0
              ? row.details.message
              : `Reconciliation gap detected: ${row.gap_type}.`,
          correlationId: row.correlation_id,
          strategyId: row.strategy_id ?? undefined,
        },
      });
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
}

export async function registerSsePlugin(app: FastifyInstance): Promise<void> {
  const overviewService = new OverviewService();
  const decisionService = new DecisionService();
  const tradeService = new TradeService();
  const alertService = new AlertService();
  const liveSubscriptionService = new LiveSubscriptionService();

  app.get("/api/live/stream", async (request, reply) => {
    if (!request.sessionContext) {
      return reply.code(401).send(
        apiErrorSchema.parse({
          error: {
            code: "unauthorized",
            message: "Authentication required.",
          },
        })
      );
    }

    const parsedRequest = liveSubscriptionRequestSchema.parse({
      channels: normalizeArrayQuery(
        (request.query as Record<string, unknown>).channels
      ) ?? ["overview"],
      strategy: normalizeArrayQuery(
        (request.query as Record<string, unknown>).strategy
      ),
      compare: normalizeArrayQuery(
        (request.query as Record<string, unknown>).compare
      ),
      timezone:
        (request.query as Record<string, unknown>).timezone === "local"
          ? "local"
          : "utc",
      detailLevel:
        (request.query as Record<string, unknown>).detailLevel === "debug"
          ? "debug"
          : "standard",
    });
    const { effectiveCapability } = requireSessionContext(request).session;
    const authorization = liveSubscriptionService.authorize({
      effectiveCapability,
      request: parsedRequest,
    });

    if (!authorization.allowed) {
      await app.denialAuditService.record({
        actorUserId: request.sessionContext.session.principal.userId,
        action: "stream.subscribe",
        targetType: "stream",
        targetId: "/api/live/stream",
        reason: authorization.reason ?? "Stream denied.",
        details: {
          channels: parsedRequest.channels,
          detailLevel: parsedRequest.detailLevel,
        },
      });

      return reply.code(403).send(
        apiErrorSchema.parse({
          error: {
            code: "forbidden",
            message: authorization.reason ?? "Live subscription denied.",
          },
        })
      );
    }
    const session = requireSessionContext(request).session;
    const testStreamMode = request.headers["x-kqd-test-stream-mode"];
    const snapshotMode = testStreamMode === "snapshot";
    const snapshotCurrentMode = testStreamMode === "snapshot-current";
    const requestedStrategyIds = normalizeRequestedStrategies({
      strategy: parsedRequest.strategy,
      compare: parsedRequest.compare,
    });
    const streamStrategyScope =
      requestedStrategyIds && requestedStrategyIds.length > 0
        ? requestedStrategyIds
        : session.effectiveCapability.strategyScope;
    const rawLastEventId = request.headers["last-event-id"];
    const hasLastEventId =
      typeof rawLastEventId === "string" && rawLastEventId.trim().length > 0;
    const lastEventId = Number(hasLastEventId ? rawLastEventId : "0");
    const requestedAfterProjectionChangeId = Number.isFinite(lastEventId)
      ? lastEventId
      : 0;
    const hasReplayCursor =
      hasLastEventId && requestedAfterProjectionChangeId > 0;
    const projectionWindow = await readProjectionWindow(
      authorization.filteredChannels
    );
    const afterProjectionChangeId =
      hasReplayCursor || snapshotMode
        ? requestedAfterProjectionChangeId
        : projectionWindow.latestProjectionChangeId;

    if (
      requestedAfterProjectionChangeId > 0 &&
      projectionWindow.earliestProjectionChangeId > 0 &&
      requestedAfterProjectionChangeId <
        projectionWindow.earliestProjectionChangeId - 1
    ) {
      const emittedAt = new Date().toISOString();
      const event = streamResyncRequiredEventSchema.parse({
        ...baseStreamEnvelope({
          projectionChangeId:
            projectionWindow.latestProjectionChangeId ||
            projectionWindow.earliestProjectionChangeId,
          detailLevel: authorization.detailLevel,
          emittedAt,
        }),
        channel: "overview",
        kind: "resync_required",
        payload: {
          reason: "Last-Event-ID is older than the retained stream window.",
          affectedChannels: authorization.filteredChannels,
          refetch: true,
          cursorStart: projectionWindow.earliestProjectionChangeId,
        },
      });

      reply.header("cache-control", "no-cache");
      reply.header("connection", "keep-alive");
      reply.type("text/event-stream; charset=utf-8");
      return `retry: 250\n\nevent: stream.resync_required\nid: ${event.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`;
    }

    if (
      hasReplayCursor &&
      projectionWindow.latestProjectionChangeId -
        requestedAfterProjectionChangeId >
        MAX_STREAM_BACKFILL_CHANGES
    ) {
      const emittedAt = new Date().toISOString();
      const event = streamResyncRequiredEventSchema.parse({
        ...baseStreamEnvelope({
          projectionChangeId: projectionWindow.latestProjectionChangeId,
          detailLevel: authorization.detailLevel,
          emittedAt,
        }),
        channel: "overview",
        kind: "resync_required",
        payload: {
          reason: "Last-Event-ID is too far behind the current stream head.",
          affectedChannels: authorization.filteredChannels,
          refetch: true,
          cursorStart: projectionWindow.latestProjectionChangeId,
        },
      });

      reply.header("cache-control", "no-cache");
      reply.header("connection", "keep-alive");
      reply.type("text/event-stream; charset=utf-8");
      return `retry: 250\n\nevent: stream.resync_required\nid: ${event.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`;
    }

    async function buildEventBlocks(cursor: number) {
      const emittedAt = new Date().toISOString();
      const latestProjectionChangeId =
        await overviewService.getLatestProjectionChangeId();
      const eventBlocks: string[] = [];

      const gapEvents = await readGapEvents({
        strategyScope: streamStrategyScope,
        filteredChannels: authorization.filteredChannels,
        detailLevel: authorization.detailLevel,
        emittedAt,
        projectionChangeId: latestProjectionChangeId,
      });
      for (const gapEvent of gapEvents) {
        eventBlocks.push(
          `event: stream.gap\nid: ${gapEvent.projectionChangeId}\ndata: ${JSON.stringify(gapEvent)}\n\n`
        );
      }

      if (authorization.filteredChannels.includes("overview")) {
        const overview = await overviewService.getOverview({
          strategyScope: streamStrategyScope,
        });
        const snapshotEnvelope = overviewSnapshotEventSchema.parse({
          projectionChangeId: latestProjectionChangeId,
          channel: "overview",
          kind: "snapshot",
          detailLevel: authorization.detailLevel,
          emittedAt,
          effectiveOccurredAt: overview.healthSummary.freshnessTimestamp,
          payload: overview,
        });
        eventBlocks.push(
          `event: overview.snapshot\nid: ${latestProjectionChangeId}\ndata: ${JSON.stringify(snapshotEnvelope)}\n\n`
        );

        const statusEnvelope = streamStatusEventSchema.parse({
          projectionChangeId: latestProjectionChangeId,
          channel: "overview",
          kind: "status",
          detailLevel: authorization.detailLevel,
          emittedAt,
          effectiveOccurredAt: overview.healthSummary.freshnessTimestamp,
          payload: {
            connectionState: overview.healthSummary.degraded
              ? "degraded"
              : "connected",
            freshnessTimestamp: overview.healthSummary.freshnessTimestamp,
            degraded: overview.healthSummary.degraded,
            reconciliationPending: false,
          },
        });
        eventBlocks.push(
          `event: stream.status\nid: ${latestProjectionChangeId}\ndata: ${JSON.stringify(statusEnvelope)}\n\n`
        );
      }

      if (authorization.filteredChannels.includes("decisions")) {
        const decisionChanges = await projectDecisionStreamChanges({
          afterProjectionChangeId: cursor,
          strategyScope: streamStrategyScope,
        });

        for (const change of decisionChanges) {
          const event = decisionUpsertEventSchema.parse({
            projectionChangeId: change.projectionChangeId,
            channel: "decisions",
            kind: "upsert",
            detailLevel: authorization.detailLevel,
            emittedAt,
            effectiveOccurredAt: change.effectiveOccurredAt,
            payload: {
              correlationId: change.row.correlationId,
              row: change.row,
              debug:
                authorization.detailLevel === "debug"
                  ? await decisionService
                      .getDetail({
                        correlationId: change.row.correlationId,
                        effectiveCapability: session.effectiveCapability,
                        detailLevel: "debug",
                      })
                      .then((detail) => detail?.debugMetadata)
                  : undefined,
            },
          });

          eventBlocks.push(
            `event: decision.upsert\nid: ${change.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`
          );
        }
      }

      if (authorization.filteredChannels.includes("trades")) {
        const tradeChanges = await projectTradeStreamChanges({
          afterProjectionChangeId: cursor,
          strategyScope: streamStrategyScope,
        });

        for (const change of tradeChanges) {
          const event = tradeUpsertEventSchema.parse({
            projectionChangeId: change.projectionChangeId,
            channel: "trades",
            kind: "upsert",
            detailLevel: authorization.detailLevel,
            emittedAt,
            effectiveOccurredAt: change.effectiveOccurredAt,
            payload: {
              correlationId: change.row.correlationId,
              row: change.row,
              debug:
                authorization.detailLevel === "debug"
                  ? await tradeService
                      .getDetail({
                        correlationId: change.row.correlationId,
                        effectiveCapability: session.effectiveCapability,
                        detailLevel: "debug",
                      })
                      .then((detail) => detail?.debugMetadata)
                  : undefined,
            },
          });

          eventBlocks.push(
            `event: trade.upsert\nid: ${change.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`
          );
        }
      }

      if (authorization.filteredChannels.includes("skips")) {
        const skipChanges = await projectSkipStreamChanges({
          afterProjectionChangeId: cursor,
          strategyScope: streamStrategyScope,
        });

        for (const change of skipChanges) {
          const event = skipUpsertEventSchema.parse({
            ...baseStreamEnvelope({
              projectionChangeId: change.projectionChangeId,
              detailLevel: authorization.detailLevel,
              emittedAt,
              effectiveOccurredAt: change.effectiveOccurredAt,
            }),
            channel: "skips",
            kind: "upsert",
            payload: {
              correlationId: change.row.correlationId,
              row: change.row,
            },
          });

          eventBlocks.push(
            `event: skip.upsert\nid: ${change.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`
          );
        }
      }

      if (authorization.filteredChannels.includes("pnl")) {
        const pnlChanges = await projectPnlStreamChanges({
          afterProjectionChangeId: cursor,
          strategyScope: streamStrategyScope,
        });

        for (const change of pnlChanges) {
          const event = pnlUpsertEventSchema.parse({
            projectionChangeId: change.projectionChangeId,
            channel: "pnl",
            kind: "upsert",
            detailLevel: authorization.detailLevel,
            emittedAt,
            effectiveOccurredAt: change.effectiveOccurredAt,
            payload: {
              scopeType: change.scopeType,
              scopeKey: change.scopeKey,
              bucketType: change.bucketType,
              summary: change.summary,
            },
          });

          eventBlocks.push(
            `event: pnl.upsert\nid: ${change.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`
          );
        }
      }

      if (authorization.filteredChannels.includes("operations")) {
        const queueChanges = await projectQueueMetricStreamChanges({
          afterProjectionChangeId: cursor,
        });

        for (const change of queueChanges) {
          const event = queueMetricUpsertEventSchema.parse({
            projectionChangeId: change.projectionChangeId,
            channel: "operations",
            kind: "upsert",
            detailLevel: authorization.detailLevel,
            emittedAt,
            effectiveOccurredAt: change.effectiveOccurredAt,
            payload: {
              queueName: change.queueName,
              row: change.row,
            },
          });

          eventBlocks.push(
            `event: queue_metric.upsert\nid: ${change.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`
          );
        }
      }

      if (authorization.filteredChannels.includes("alerts")) {
        const alertChanges = await projectAlertStreamChanges({
          afterProjectionChangeId: cursor,
          strategyScope: streamStrategyScope,
          ...(requestedStrategyIds ? { requestedStrategyIds } : {}),
        });

        for (const change of alertChanges) {
          const event = alertUpsertEventSchema.parse({
            projectionChangeId: change.projectionChangeId,
            channel: "alerts",
            kind: "upsert",
            detailLevel: authorization.detailLevel,
            emittedAt,
            effectiveOccurredAt: change.effectiveOccurredAt,
            payload: {
              alertId: change.alertId,
              row: change.row,
              debug:
                authorization.detailLevel === "debug"
                  ? await alertService
                      .getDetail({
                        alertId: change.alertId,
                        effectiveCapability: session.effectiveCapability,
                        detailLevel: "debug",
                      })
                      .then((detail) => detail?.summary.metadata)
                  : undefined,
            },
          });

          eventBlocks.push(
            `event: alert.upsert\nid: ${change.projectionChangeId}\ndata: ${JSON.stringify(event)}\n\n`
          );
        }
      }

      return {
        latestProjectionChangeId,
        eventBlocks,
      };
    }

    const initialEmission = await buildEventBlocks(afterProjectionChangeId);

    if (snapshotMode || snapshotCurrentMode) {
      reply.header("cache-control", "no-cache");
      reply.header("connection", "keep-alive");
      reply.type("text/event-stream; charset=utf-8");
      return `retry: 250\n\n${initialEmission.eventBlocks.join("")}`;
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "cache-control": "no-cache",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
    });
    reply.raw.write(`retry: 250\n\n${initialEmission.eventBlocks.join("")}`);

    let currentProjectionChangeId = Math.max(
      afterProjectionChangeId,
      initialEmission.latestProjectionChangeId
    );
    let closed = false;
    let pollInFlight = false;

    const cleanup = () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(heartbeatTimer);
      clearInterval(pollTimer);
    };

    const heartbeatTimer = setInterval(() => {
      if (!closed) {
        reply.raw.write(`: keepalive ${Date.now()}\n\n`);
      }
    }, SSE_HEARTBEAT_INTERVAL_MS);

    const pollTimer = setInterval(() => {
      if (closed || pollInFlight) {
        return;
      }

      pollInFlight = true;
      void (async () => {
        try {
          const latestProjectionChangeId =
            await overviewService.getLatestProjectionChangeId();
          if (latestProjectionChangeId <= currentProjectionChangeId) {
            return;
          }

          const emission = await buildEventBlocks(currentProjectionChangeId);
          if (emission.eventBlocks.length > 0) {
            reply.raw.write(emission.eventBlocks.join(""));
          }
          currentProjectionChangeId = Math.max(
            currentProjectionChangeId,
            emission.latestProjectionChangeId
          );
        } catch (error) {
          app.log.error({ err: error }, "Live stream poll failed.");
          cleanup();
          reply.raw.destroy(error as Error);
        } finally {
          pollInFlight = false;
        }
      })();
    }, SSE_POLL_INTERVAL_MS);

    request.raw.on("close", cleanup);
    reply.raw.on("close", cleanup);
  });
}
