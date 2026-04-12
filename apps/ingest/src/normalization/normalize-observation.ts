import { createHash, randomUUID } from "node:crypto";

import {
  deadLetterRecordSchema,
  executorEnvelopeSchema,
  executionRecordSchema,
  normalizedDashboardEventSchema,
  normalizedEventObservationSchema,
  publisherEnvelopeSchema,
  quantDashboardLiveSchema,
  quantHealthSchema,
  quantOrdersEnvelopeSchema,
  quantPnlSchema,
  quantPositionsEnvelopeSchema,
  quantRealizedPnlSchema,
  quantStatusSchema,
  quantTradesEnvelopeSchema,
  rabbitMqQueueMetricSampleSchema,
  noTradeDiagnosticSchema,
  type NormalizedDashboardEvent,
  type NormalizedEventObservation
} from "@kalshi-quant-dashboard/contracts";
import type { SourceObservationInput } from "@kalshi-quant-dashboard/source-adapters";
import {
  normalizeDashboardSkipRow,
  normalizeRuntimeSkipDecision
} from "./skip-normalizer.js";
import { normalizeNoOrderDiagnosticPayload } from "./no-order-normalizer.js";

export interface NormalizedEntry {
  readonly event: NormalizedDashboardEvent;
  readonly observation: NormalizedEventObservation;
}

export interface NormalizedBundle {
  readonly entries: readonly NormalizedEntry[];
}

interface DeliveryMetadata {
  readonly exchange?: string;
  readonly queue?: string;
  readonly routingKey?: string;
  readonly deliveryTag?: number | string;
  readonly redelivered?: boolean;
  readonly sourceSequence?: number | string;
  readonly sourceDeliveryOrdinal?: number;
  readonly replayKind?: "live" | "redelivery" | "replay" | "backfill" | "resync";
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function strategyIdFromRepo(repoName: string | undefined): string | undefined {
  if (!repoName) {
    return undefined;
  }

  return repoName.replace(/^kalshi-/, "").replace(/-quant$/, "");
}

function buildDedupKey(
  sourceSystem: string,
  sourceEventName: string,
  sourceEventId: string | undefined,
  fallback: unknown
): string {
  if (sourceEventId) {
    return `${sourceSystem}:${sourceEventName}:${sourceEventId}`;
  }

  return `${sourceSystem}:${sourceEventName}:semantic:${hash(fallback)}`;
}

function createEntry(
  input: SourceObservationInput,
  args: {
    readonly sourceEventName: string;
    readonly sourceEventId?: string | undefined;
    readonly sourceEnvelopeId?: string | undefined;
    readonly correlationId: string;
    readonly strategyId?: string | undefined;
    readonly canonicalFamily: NormalizedDashboardEvent["canonicalFamily"];
    readonly lifecycleStage: NormalizedDashboardEvent["lifecycleStage"];
    readonly occurredAt: string;
    readonly publishedAt?: string | undefined;
    readonly aliases?: NormalizedDashboardEvent["aliases"] | undefined;
    readonly normalizedPayload: Record<string, unknown>;
    readonly rawPayload: Record<string, unknown>;
    readonly degradedReasons?: string[] | undefined;
    readonly sourcePathMode?: NormalizedDashboardEvent["sourcePathMode"] | undefined;
  }
): NormalizedEntry {
  const metadata = (input.metadata ?? {}) as DeliveryMetadata;
  const replayKind = input.replayKind ?? metadata.replayKind ?? "live";
  const receivedAt = new Date().toISOString();
  const sourceRepo = input.sourceRepo;
  const strategyId = args.strategyId ?? input.strategyId ?? strategyIdFromRepo(sourceRepo);
  const dedupKey = buildDedupKey(
    input.sourceProfile.sourceSystem,
    args.sourceEventName,
    args.sourceEventId,
    {
      correlationId: args.correlationId,
      strategyId,
      occurredAt: args.occurredAt,
      normalizedPayload: args.normalizedPayload
    }
  );

  const event = normalizedDashboardEventSchema.parse({
    canonicalEventId: randomUUID(),
    correlationId: args.correlationId,
    strategyId,
    canonicalFamily: args.canonicalFamily,
    lifecycleStage: args.lifecycleStage,
    sourceSystem: input.sourceProfile.sourceSystem,
    sourceVariant: input.sourceProfile.sourceVariant,
    sourceRepo,
    sourceEventName: args.sourceEventName,
    sourceEventId: args.sourceEventId,
    sourceEnvelopeId: args.sourceEnvelopeId,
    sourceContractVersion: input.sourceProfile.contractVersion,
    adapterVersion: input.sourceProfile.contractVersion,
    sourcePathMode:
      args.sourcePathMode ??
      (strategyId === "btc"
        ? "hybrid"
        : input.sourceProfile.sourceSystem === "strategy_adapter"
          ? "direct_only"
          : "publisher_only"),
    dedupKey,
    occurredAt: args.occurredAt,
    publishedAt: args.publishedAt,
    firstSeenAt: receivedAt,
    lastSeenAt: receivedAt,
    ordering: {
      sourceSequence: metadata.sourceSequence,
      sourceDeliveryOrdinal: metadata.sourceDeliveryOrdinal,
      brokerExchange: metadata.exchange,
      brokerQueue: metadata.queue,
      brokerRoutingKey: metadata.routingKey,
      brokerDeliveryTag: metadata.deliveryTag,
      hasRedelivery: metadata.redelivered ?? false,
      hasReplay: replayKind === "replay" || replayKind === "resync",
      hasBackfill: replayKind === "backfill"
    },
    aliases: args.aliases ?? [],
    degradedReasons: args.degradedReasons ?? [],
    reconciliationStatus: "pending",
    normalizedPayload: args.normalizedPayload,
    rawPayload: args.rawPayload
  });

  const observation = normalizedEventObservationSchema.parse({
    eventObservationId: randomUUID(),
    canonicalEventId: event.canonicalEventId,
    sourceSystem: event.sourceSystem,
    sourceVariant: event.sourceVariant,
    sourceRepo,
    sourceEventName: args.sourceEventName,
    sourceEventId: args.sourceEventId,
    sourceEnvelopeId: args.sourceEnvelopeId,
    replayKind,
    isRedelivered: metadata.redelivered ?? false,
    isBackfill: replayKind === "backfill",
    correlationIdCandidate: args.correlationId,
    dedupKeyCandidate: dedupKey,
    publishedAt: args.publishedAt,
    receivedAt,
    sourceSequence: metadata.sourceSequence,
    sourceDeliveryOrdinal: metadata.sourceDeliveryOrdinal,
    brokerExchange: metadata.exchange,
    brokerQueue: metadata.queue,
    brokerRoutingKey: metadata.routingKey,
    brokerDeliveryTag: metadata.deliveryTag,
    adapterVersion: input.sourceProfile.contractVersion,
    acceptedAsNewFact: false,
    rawPayload: args.rawPayload
  });

  return { event, observation };
}

export function normalizeObservation(input: SourceObservationInput): NormalizedBundle {
  const variant = input.sourceProfile.sourceVariant;

  if (variant === "publisher-envelope-v1" || variant === "publisher-result-v1") {
    const envelope = publisherEnvelopeSchema.parse(input.payload);
    const name = envelope.name;
    const aliases = Object.entries(envelope.attributes)
      .filter(([, value]) => value)
      .filter(([key]) =>
        [
          "tradeIntentId",
          "publisherOrderId",
          "clientOrderId",
          "externalOrderId",
          "commandEventId"
        ].includes(key)
      )
      .map(([key, value]) => ({
        kind: key,
        value: value!,
        source: input.sourceProfile.sourceVariant
      }));

    return {
      entries: [
        createEntry(input, {
          sourceEventName: name,
          sourceEventId: envelope.id,
          sourceEnvelopeId: envelope.id,
          correlationId: envelope.correlationId ?? `missing-corr:${envelope.id}`,
          strategyId: strategyIdFromRepo(envelope.attributes.strategyName ?? input.sourceRepo),
          canonicalFamily:
            name === "trade-intent.created"
              ? "trade_intent"
              : name === "order.created"
                ? "trade"
                : name.startsWith("order.execution")
                  ? "executor_event"
                  : name.endsWith("dead_lettered")
                    ? "executor_event"
                    : "publisher_event",
          lifecycleStage:
            name === "trade-intent.created"
              ? "intent"
              : name === "order.created"
                ? "publisher"
                : name === "order.execution_blocked"
                  ? "executor"
                  : name.endsWith("dead_lettered")
                    ? "dead_letter"
                    : name.startsWith("order.execution")
                      ? "terminal"
                      : "publisher",
          occurredAt: envelope.occurredAt,
          publishedAt: envelope.occurredAt,
          aliases,
          normalizedPayload: {
            ...envelope.attributes,
            resourceId: envelope.resourceId,
            category: envelope.category
          },
          rawPayload: envelope
        })
      ]
    };
  }

  if (variant === "standalone-executor-v1") {
    const envelopeCandidate = executorEnvelopeSchema.safeParse(input.payload);
    if (envelopeCandidate.success) {
      const envelope = envelopeCandidate.data;
      const aliases = Object.entries(envelope.attributes)
        .filter(([, value]) => value)
        .filter(([key]) =>
          [
            "tradeIntentId",
            "publisherOrderId",
            "clientOrderId",
            "externalOrderId",
            "commandEventId"
          ].includes(key)
        )
        .map(([key, value]) => ({
          kind: key,
          value: value!,
          source: variant
        }));

      return {
        entries: [
          createEntry(input, {
            sourceEventName: envelope.name,
            sourceEventId: envelope.id,
            sourceEnvelopeId: envelope.id,
            correlationId: envelope.correlationId ?? `missing-corr:${envelope.id}`,
            strategyId: strategyIdFromRepo(envelope.attributes.strategyName ?? input.sourceRepo),
            canonicalFamily: "executor_event",
            lifecycleStage: envelope.name.endsWith("blocked")
              ? "executor"
              : envelope.name.endsWith("dead_lettered")
                ? "dead_letter"
                : "terminal",
            occurredAt: envelope.occurredAt,
            publishedAt: envelope.occurredAt,
            aliases,
            normalizedPayload: {
              ...envelope.attributes,
              resourceId: envelope.resourceId,
              category: envelope.category
            },
            rawPayload: envelope,
            sourcePathMode: "publisher_only"
          })
        ]
      };
    }

    const record = executionRecordSchema.parse(input.payload);
    return {
      entries: [
        createEntry(input, {
          sourceEventName: "execution.recorded",
          sourceEventId: record.externalOrderId,
          correlationId: record.correlationId ?? `missing-corr:${record.externalOrderId}`,
          canonicalFamily: "trade",
          lifecycleStage:
            record.status && ["accepted", "filled", "executed", "failed", "canceled"].includes(record.status)
              ? "terminal"
              : "executor",
          occurredAt: record.recordedAtUtc,
          aliases: [
            { kind: "externalOrderId", value: record.externalOrderId, source: variant },
            { kind: "clientOrderId", value: record.clientOrderId, source: variant },
            ...(record.publisherOrderId
              ? [{ kind: "publisherOrderId", value: record.publisherOrderId, source: variant }]
              : []),
            ...(record.tradeIntentId
              ? [{ kind: "tradeIntentId", value: record.tradeIntentId, source: variant }]
              : [])
          ],
          normalizedPayload: record,
          rawPayload: record
        })
      ]
    };
  }

  if (variant === "standalone-executor-dead-letter-v1") {
    const deadLetter = deadLetterRecordSchema.parse(input.payload);
    return {
      entries: [
        createEntry(input, {
          sourceEventName: deadLetter.sourceEventName,
          sourceEventId: deadLetter.id,
          sourceEnvelopeId: deadLetter.sourceEventId,
          correlationId: deadLetter.correlationId ?? `missing-corr:${deadLetter.id}`,
          canonicalFamily: "executor_event",
          lifecycleStage: "dead_letter",
          occurredAt: deadLetter.deadLetteredAtUtc,
          aliases: deadLetter.resourceId
            ? [{ kind: "resourceId", value: deadLetter.resourceId, source: variant }]
            : [],
          normalizedPayload: deadLetter,
          rawPayload: deadLetter
        })
      ]
    };
  }

  if (variant === "quant-health-v1") {
    const health = quantHealthSchema.parse(input.payload);
    return {
      entries: [
        createEntry(input, {
          sourceEventName: "quant.health.snapshot",
          sourceEventId: `${input.sourceRepo}:${health.last_scan_at ?? "no-scan"}`,
          correlationId: `${input.sourceRepo}:heartbeat`,
          canonicalFamily: "heartbeat",
          lifecycleStage: "heartbeat",
          occurredAt: health.last_scan_at ?? new Date().toISOString(),
          normalizedPayload: health,
          rawPayload: health
        })
      ]
    };
  }

  if (variant === "quant-runtime-v1") {
    const status = quantStatusSchema.parse(input.payload);
    const decisions = status.latest_decisions.map((decision) =>
      createEntry(input, {
        sourceEventName: "quant.decision",
        correlationId: `${input.sourceRepo}:${decision.ticker}:${decision.timestamp}`,
        canonicalFamily: decision.action === "skip" ? "skip" : "decision",
        lifecycleStage: decision.action === "skip" ? "skip" : "strategy_emission",
        occurredAt: decision.timestamp,
        aliases: [{ kind: "ticker", value: decision.ticker, source: variant }],
        normalizedPayload:
          decision.action === "skip"
            ? normalizeRuntimeSkipDecision({
                strategyId: input.strategyId,
                marketTicker: decision.ticker,
                action: decision.action,
                side: decision.side,
                contracts: decision.contracts,
                price: decision.price,
                edge: decision.edge,
                reasonRaw: decision.reason,
                decisionAt: decision.timestamp
              })
            : {
            strategyId: input.strategyId,
            marketTicker: decision.ticker,
            action: decision.action,
            side: decision.side,
            contracts: decision.contracts,
            price: decision.price,
            edge: decision.edge,
            reasonRaw: decision.reason,
            decisionAt: decision.timestamp
          },
        rawPayload: decision
      })
    );
    const heartbeat = createEntry(input, {
      sourceEventName: "quant.status.snapshot",
      sourceEventId: `${input.sourceRepo}:${status.last_scan_at ?? "no-scan"}`,
      correlationId: `${input.sourceRepo}:status`,
      canonicalFamily: "heartbeat",
      lifecycleStage: "heartbeat",
      occurredAt: status.last_scan_at ?? new Date().toISOString(),
      normalizedPayload: {
        halted: status.halted,
        mode: status.mode,
        lastScanAt: status.last_scan_at,
        momentum: status.momentum ?? null
      },
      rawPayload: status
    });

    return { entries: [heartbeat, ...decisions] };
  }

  if (variant === "quant-trades-v1") {
    const envelope = quantTradesEnvelopeSchema.parse(input.payload);
    return {
      entries: envelope.trades.map((trade) =>
        createEntry(input, {
          sourceEventName: "quant.trade",
          sourceEventId: trade.id,
          correlationId: `${input.sourceRepo}:${trade.ticker}:${trade.id}`,
          canonicalFamily: trade.trade_type === "OPEN" ? "trade" : "fill",
          lifecycleStage:
            trade.trade_type === "OPEN"
              ? "submission"
              : trade.trade_type === "SETTLE"
                ? "terminal"
                : "fill",
          occurredAt: trade.timestamp,
          aliases: [{ kind: "tradeId", value: trade.id, source: variant }],
          normalizedPayload: trade,
          rawPayload: trade
        })
      )
    };
  }

  if (variant === "quant-positions-v1") {
    const positions = quantPositionsEnvelopeSchema.parse(input.payload);
    return {
      entries: positions.map((position) =>
        createEntry(input, {
          sourceEventName: "quant.position.snapshot",
          sourceEventId: `${position.ticker}:${position.updated_at}`,
          correlationId: `${input.sourceRepo}:position:${position.ticker}`,
          canonicalFamily: "position_snapshot",
          lifecycleStage: "position",
          occurredAt: position.updated_at,
          aliases: [{ kind: "ticker", value: position.ticker, source: variant }],
          normalizedPayload: position,
          rawPayload: position
        })
      )
    };
  }

  if (variant === "quant-orders-v1") {
    const envelope = quantOrdersEnvelopeSchema.parse(input.payload);
    return {
      entries: envelope.orders.map((order) =>
        createEntry(input, {
          sourceEventName: "quant.order",
          sourceEventId: order.order_id,
          correlationId: `${input.sourceRepo}:${order.client_order_id}`,
          canonicalFamily: "trade",
          lifecycleStage: "submission",
          occurredAt: new Date().toISOString(),
          aliases: [
            { kind: "orderId", value: order.order_id, source: variant },
            { kind: "clientOrderId", value: order.client_order_id, source: variant }
          ],
          normalizedPayload: order,
          rawPayload: order
        })
      )
    };
  }

  if (variant === "quant-pnl-v1") {
    const pnl = quantPnlSchema.parse(input.payload);
    return {
      entries: [
        createEntry(input, {
          sourceEventName: "quant.pnl.snapshot",
          sourceEventId: `${input.sourceRepo}:${new Date().toISOString()}`,
          correlationId: `${input.sourceRepo}:pnl`,
          canonicalFamily: "pnl_snapshot",
          lifecycleStage: "pnl",
          occurredAt: new Date().toISOString(),
          normalizedPayload: pnl,
          rawPayload: pnl
        })
      ]
    };
  }

  if (variant === "quant-realized-pnl-v1") {
    const pnl = quantRealizedPnlSchema.parse(input.payload);
    return {
      entries: [
        createEntry(input, {
          sourceEventName: "quant.realized_pnl.snapshot",
          sourceEventId: `${input.sourceRepo}:realized:${new Date().toISOString()}`,
          correlationId: `${input.sourceRepo}:pnl`,
          canonicalFamily: "pnl_snapshot",
          lifecycleStage: "pnl",
          occurredAt: new Date().toISOString(),
          normalizedPayload: pnl,
          rawPayload: pnl
        })
      ]
    };
  }

  if (variant === "quant-dashboard-live-v1") {
    const dashboard = quantDashboardLiveSchema.parse(input.payload);
    const skipped = (dashboard.skippedTrades ?? []).map((row, index) =>
      createEntry(input, {
        sourceEventName: "quant.dashboard.skip",
        correlationId: `${input.sourceRepo}:dashboard:skip:${index}:${String(row.ticker ?? "system")}`,
        canonicalFamily: "skip",
        lifecycleStage: "skip",
        occurredAt: String(row.timestamp ?? new Date().toISOString()),
        normalizedPayload: normalizeDashboardSkipRow(row as Record<string, unknown>),
        rawPayload: row as Record<string, unknown>
      })
    );
    const buyIntents = (dashboard.buyOrderIntent ?? []).map((row, index) =>
      createEntry(input, {
        sourceEventName: "quant.dashboard.buy_intent",
        correlationId: `${input.sourceRepo}:dashboard:intent:${index}:${String(row.ticker ?? "unknown")}`,
        canonicalFamily: "decision",
        lifecycleStage: "strategy_emission",
        occurredAt: String(row.timestamp ?? new Date().toISOString()),
        normalizedPayload: row as Record<string, unknown>,
        rawPayload: row as Record<string, unknown>
      })
    );

    return { entries: [...buyIntents, ...skipped] };
  }

  if (variant === "quant-no-trade-diagnostics-v1") {
    const diagnostics = noTradeDiagnosticSchema.parse(input.payload);
    return {
      entries: [
        createEntry(input, {
          sourceEventName: "quant.no_trade_diagnostic",
          sourceEventId: `${input.sourceRepo}:${diagnostics.ran_at}`,
          correlationId: `${input.sourceRepo}:no-trade:${diagnostics.ran_at}`,
          canonicalFamily: "skip",
          lifecycleStage: "skip",
          occurredAt: diagnostics.ran_at,
          normalizedPayload: normalizeNoOrderDiagnosticPayload(diagnostics),
          rawPayload: diagnostics
        })
      ]
    };
  }

  if (variant === "rabbitmq-management-v1") {
    const sample = rabbitMqQueueMetricSampleSchema.parse(input.payload);
    return {
      entries: [
        createEntry(input, {
          sourceEventName: "rabbitmq.queue_metric",
          sourceEventId: `${sample.queueName}:${sample.capturedAt}`,
          correlationId: `rabbitmq:${sample.queueName}`,
          canonicalFamily: "queue_metric",
          lifecycleStage: "queue",
          occurredAt: sample.capturedAt,
          normalizedPayload: sample,
          rawPayload: sample,
          sourcePathMode: "publisher_only"
        })
      ]
    };
  }

  throw new Error(`Unsupported source variant '${variant}'.`);
}
