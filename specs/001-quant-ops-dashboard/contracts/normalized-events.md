# Normalized Event Contract

## Canonical Fact Contract

Every accepted business fact is stored internally as:

```ts
type NormalizedDashboardEvent = {
  canonicalEventId: string;
  correlationId: string;
  strategyId?: string;
  canonicalFamily:
    | "decision"
    | "trade"
    | "trade_intent"
    | "skip"
    | "publisher_event"
    | "queue_metric"
    | "executor_event"
    | "fill"
    | "position_snapshot"
    | "pnl_snapshot"
    | "heartbeat"
    | "alert"
    | "audit_event";
  lifecycleStage:
    | "strategy_emission"
    | "skip"
    | "intent"
    | "publisher"
    | "queue"
    | "executor"
    | "submission"
    | "fill"
    | "position"
    | "pnl"
    | "heartbeat"
    | "alert"
    | "terminal"
    | "dead_letter";
  sourceSystem:
    | "strategy_adapter"
    | "publisher"
    | "executor"
    | "rabbitmq_management"
    | "dashboard";
  sourceVariant: string;
  sourceRepo: string;
  sourceEventName: string;
  sourceEventId?: string;
  sourceEnvelopeId?: string;
  sourceContractVersion?: string;
  adapterVersion: string;
  sourcePathMode: "publisher_only" | "direct_only" | "hybrid";
  dedupKey: string;
  occurredAt: string;
  publishedAt?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  ordering: {
    sourceSequence?: number | string;
    sourceDeliveryOrdinal?: number;
    brokerExchange?: string;
    brokerQueue?: string;
    brokerRoutingKey?: string;
    brokerDeliveryTag?: number | string;
    hasRedelivery: boolean;
    hasReplay: boolean;
    hasBackfill: boolean;
  };
  aliases: IdentifierAlias[];
  degradedReasons: string[];
  reconciliationStatus:
    | "pending"
    | "consistent"
    | "partial"
    | "gap_detected"
    | "corrected";
  normalizedPayload: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
};
```

## Observation Contract

Every intake observation, including duplicates and redeliveries, is retained as:

```ts
type NormalizedEventObservation = {
  eventObservationId: string;
  canonicalEventId?: string;
  sourceSystem:
    | "strategy_adapter"
    | "publisher"
    | "executor"
    | "rabbitmq_management"
    | "dashboard";
  sourceVariant: string;
  sourceRepo: string;
  sourceEventName: string;
  sourceEventId?: string;
  sourceEnvelopeId?: string;
  replayKind: "live" | "redelivery" | "replay" | "backfill" | "resync";
  isRedelivered: boolean;
  isBackfill: boolean;
  correlationIdCandidate?: string;
  dedupKeyCandidate: string;
  publishedAt?: string;
  receivedAt: string;
  sourceSequence?: number | string;
  sourceDeliveryOrdinal?: number;
  brokerExchange?: string;
  brokerQueue?: string;
  brokerRoutingKey?: string;
  brokerDeliveryTag?: number | string;
  adapterVersion: string;
  acceptedAsNewFact: boolean;
  schemaValidationError?: string;
  rawPayload: Record<string, unknown>;
};
```

## Ordered Convergence Semantics

- The ingest layer validates and records every `NormalizedEventObservation`.
- The first accepted observation for a `dedupKey` creates the `NormalizedDashboardEvent`.
- Later observations with the same `dedupKey` do not create a second fact. They:
  - append a new observation row
  - set `hasRedelivery`, `hasReplay`, or `hasBackfill` on the canonical fact when applicable
  - update `lastSeenAt`
  - may trigger reconciliation if the later observation carries missing aliases or terminal state
- Lifecycle timelines sort by:
  1. `occurredAt`
  2. `ordering.sourceSequence` when comparable
  3. `publishedAt`
  4. `firstSeenAt`
  5. `canonicalEventId`
- Live-feed resume ordering is handled by the separate `projection_change_id` cursor, not by broker delivery tags.

## Family-Specific Payload Requirements

### `decision`

- Required fields:
  - `strategyId`
  - `symbol`
  - `marketTicker`
  - `action`
  - `reasonRaw`
  - `decisionAt`
- Optional fields:
  - `edge`
  - `price`
  - `contracts`
  - `adapterSynthesizedIdentity`
  - `sourceDecisionId`
- Notes:
  - Strategy repos expose `TradeDecision` models with action, ticker, reason, timestamp, and optional pricing fields.
  - If no native decision id exists, the adapter emits an alias `decision_id` using the deterministic synthesized identity.

### `trade_intent`

- Required fields:
  - `strategyId`
  - `ticker`
  - `side`
  - `quantity`
  - `limitPrice`
  - `actionType`
- Optional fields:
  - `tradeIntentId`
  - `originService`
  - `decisionReason`
  - `targetPublisherOrderId`
  - `targetClientOrderId`
  - `targetExternalOrderId`

### `trade`

- Required fields:
  - `strategyId`
  - `marketTicker`
  - `side`
  - `actionType`
  - `quantity`
  - `status`
- Optional fields:
  - `publisherOrderId`
  - `clientOrderId`
  - `externalOrderId`
  - `kalshiOrderId`
  - `commandEventId`
  - `tradeIntentId`
  - `retryCount`
  - `publishStatus`
  - `lastResultStatus`
  - `targetPublisherOrderId`
  - `targetClientOrderId`
  - `targetExternalOrderId`

### `skip`

- Required fields:
  - `strategyId`
  - `marketTicker`
  - `skipCategory`
  - `reasonRaw`
  - `decisionAt`
- Optional fields:
  - `skipCode`
  - `symbol`
  - `reasonSummary`
  - `skipKind` (`skip_decision`, `no_trade_diagnostic`)
  - `batchContext`
- Notes:
  - Skip-only and no-trade diagnostics are first-class facts, not inferred absences.

### `publisher_event`

- Required fields:
  - `category`
  - `name`
  - `resourceId`
  - `attributes`
- Notes:
  - Direct mapping from the publisher `ApplicationEventEnvelope`.

### `executor_event`

- Required fields:
  - `resultName`
  - `status`
  - `attemptCount`
- Optional fields:
  - `commandEventId`
  - `publisherOrderId`
  - `tradeIntentId`
  - `externalOrderId`
  - `clientOrderId`
  - `errorType`
  - `errorMessage`
  - `replayCount`
  - `deadLetterQueue`
  - `lastReplayedAt`

### `fill`

- Required fields:
  - `tradeAttemptKey`
  - `filledQuantity`
  - `fillStatus`
  - `occurredAt`
- Optional fields:
  - `fillPrice`
  - `feeAmount`
  - `fillSequence`
  - `sourceFillId`

### `position_snapshot`

- Required fields:
  - `strategyId`
  - `marketTicker`
  - `side`
  - `contractsOpen`
  - `snapshotAt`
- Optional fields:
  - `averageEntryPrice`
  - `markPrice`
  - `unrealizedPnlNet`
  - `markSource`
  - `markStale`

### `pnl_snapshot`

- Required fields:
  - `scopeType`
  - `scopeKey`
  - `bucketType`
  - `rangeStartUtc`
  - `rangeEndUtc`
  - `realizedPnlNet`
  - `unrealizedPnlNet`
  - `feesTotal`
- Optional fields:
  - `isStale`
  - `isPartial`
  - `freshnessTimestamp`
  - `wins`
  - `losses`
  - `valuationSource`
  - `disagreementCount`

### `queue_metric`

- Required fields:
  - `componentName`
  - `queueName`
  - `messageCount`
  - `consumerCount`
  - `sampledAt`
- Optional fields:
  - `messagesReady`
  - `messagesUnacknowledged`
  - `oldestMessageAgeSeconds`
  - `publishRate`
  - `deliverRate`
  - `ackRate`
  - `redeliverRate`
  - `dlqMessageCount`
  - `dlqGrowthTotal`
  - `publishFailureCount`
  - `unroutableCount`
  - `reconnectStatus`
  - `idleSince`

### `heartbeat`

- Required fields:
  - `subjectType`
  - `subjectKey`
  - `lastSeenAt`
  - `expectedIntervalSeconds`
  - `status`

### `alert`

- Required fields:
  - `alertId`
  - `alertType`
  - `severity`
  - `componentType`
  - `componentKey`
  - `status`
  - `summary`
  - `firstSeenAt`
  - `latestSeenAt`
- Optional fields:
  - `alertRuleId`
  - `thresholdContext`
  - `strategyId`
  - `relatedCorrelationId`
  - `detailPath`

### `audit_event`

- Required fields:
  - `auditType`
  - `targetType`
  - `targetKey`
  - `action`
  - `result`
  - `occurredAt`
- Optional fields:
  - `actorUserId`
  - `actorRole`
  - `correlationId`
  - `strategyScope`

## Alias Rules

- The dashboard preserves searchable aliases for:
  - `decision_id`
  - `trade_id`
  - `trade_intent_id`
  - `publisher_order_id`
  - `command_event_id`
  - `client_order_id`
  - `external_order_id`
  - `kalshi_order_id`
  - `idempotency_key`
  - `routing_key`
  - `market_ticker`
  - `symbol`
  - `trade_record_id`

## Validation Notes

- Raw source payloads are always preserved internally but are only exposed through read APIs to roles allowed by the RBAC matrix.
- Source-boundary field mappings are defined in [source-compatibility.md](./source-compatibility.md).
- Canonical payloads must remain additive by default. Any semantic field redefinition requires versioning the relevant `sourceVariant` or contract version.
