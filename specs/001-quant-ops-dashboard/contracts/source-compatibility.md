# Source Compatibility Matrix

## Current-State Ingestion Modes

| Source | Strategy Surface | Transport | Source Variant | Current-State Role |
|---|---|---|---|---|
| `../kalshi-btc-quant` | Yes | HTTP collector plus publisher-fed lifecycle correlation | `quant-runtime-v1` | Hybrid strategy source |
| `../kalshi-eth-quant` | Yes | HTTP collector | `quant-runtime-v1` | Direct strategy source |
| `../kalshi-sol-quant` | Yes | HTTP collector | `quant-runtime-v1` | Direct strategy source |
| `../kalshi-xrp-quant` | Yes | HTTP collector | `quant-runtime-v1` | Direct strategy source |
| `../kalshi-integration-event-publisher` | No | RabbitMQ consumer plus HTTP diagnostics polling | `publisher-envelope-v1` | Central publisher and ops source |
| `../kalshi-integration-executor` | No | RabbitMQ consumer plus executor persistence/health polling | `standalone-executor-v1` | Executor and dead-letter source |
| RabbitMQ Management API | No | HTTP polling | `rabbitmq-management-v1` | Broker truth for queue and health metrics |

## Source Variant: `publisher-envelope-v1`

Observed source type: `ApplicationEventEnvelope`

```csharp
ApplicationEventEnvelope(
  Guid Id,
  string Category,
  string Name,
  string? ResourceId,
  string? CorrelationId,
  string? IdempotencyKey,
  IReadOnlyDictionary<string, string?> Attributes,
  DateTimeOffset OccurredAt)
```

Routing and queue facts observed in repo:

- Exchange: `kalshi.integration.events`
- Routing key pattern: `kalshi.integration.{normalized category}.{normalized name}`
- Queues observed:
  - `kalshi.integration.executor`
  - `kalshi.integration.executor.results`
  - `kalshi.integration.executor.dlq`
  - `kalshi.integration.event-publisher.results`
  - `kalshi.integration.event-publisher.dlq`

### Field Mapping

| Source field | Canonical field | Rule |
|---|---|---|
| `Id` | `source_event_id`, `source_envelope_id` | Stable publisher envelope identity and primary dedup candidate. |
| `Category` | `source_category` | Also contributes to `canonical_family` mapping. |
| `Name` | `source_event_name` | Also contributes to `lifecycle_stage` mapping. |
| `ResourceId` | `aliases[]` | Preserved as a searchable alias; exact alias type depends on event name. |
| `CorrelationId` | `correlation_id` | Used as canonical lifecycle key when present. |
| `IdempotencyKey` | `aliases[idempotency_key]`, dedup fallback input | Preserved for debugging and replay analysis. |
| `Attributes[strategyName]` | `strategy_id` | Normalized through strategy registry lookup. |
| `Attributes[originService]` | `source_origin_service` | Preserved as metadata. |
| `Attributes[decisionReason]` | `normalized_payload.reason_raw` | Used on decision and trade-intent facts. |
| `Attributes[commandSchemaVersion]` | `source_contract_version` | Preserved as source contract version. |
| `Attributes[tradeIntentId]` | `aliases[trade_intent_id]` | Promoted when present. |
| `Attributes[publisherOrderId]` or `ResourceId` | `aliases[publisher_order_id]` | Mapped for order and result events. |
| `Attributes[commandEventId]` | `aliases[command_event_id]` | Preserved for trade attempts and executor stitching. |
| `Attributes[clientOrderId]` | `aliases[client_order_id]` | Preserved for search and lifecycle stitching. |
| `Attributes[externalOrderId]` | `aliases[external_order_id]`, `aliases[kalshi_order_id]` when applicable | Preserved for execution and Kalshi search. |
| `OccurredAt` | `published_at`; `occurred_at` when no domain-specific business time exists | Used as canonical published timestamp. |
| RabbitMQ delivery `routingKey` | `broker_routing_key` | Captured from consumer observation, not from the envelope itself. |
| RabbitMQ delivery `exchange` | `broker_exchange` | Captured from consumer observation. |
| RabbitMQ delivery `queue` | `broker_queue` | Captured from consumer observation. |
| RabbitMQ delivery `deliveryTag` | `broker_delivery_tag` | Captured on each observation. |
| RabbitMQ delivery `redelivered` | `is_redelivered` | Captured on each observation and rolled up to the canonical fact. |

### Canonical Family and Lifecycle Mapping

| Source `Category` + `Name` | Canonical family | Lifecycle stage |
|---|---|---|
| `trading` + `trade-intent.created` | `trade_intent` | `intent` |
| `trading` + `order.created` | `trade` | `publisher` |
| `trading` + `order.execution_succeeded` | `executor_event` | `terminal` |
| `trading` + `order.execution_failed` | `executor_event` | `terminal` |
| `trading` + `order.execution_blocked` | `executor_event` | `executor` |
| `trading` + `*.dead_lettered` | `executor_event` | `dead_letter` |

### Gaps and Normalization Rules

- The envelope itself does not contain broker delivery order or redelivery metadata. The consumer observation layer must attach those fields.
- `OccurredAt` is publisher event time, not always the strategy-decision time. When a more specific business timestamp exists in attributes or source payloads, it becomes `occurred_at` and envelope `OccurredAt` stays as `published_at`.
- Publisher and embedded-executor sources are treated as versioned variants because the publisher repo includes richer result projection and diagnostics than the standalone executor repo.

## Source Variant: `standalone-executor-v1`

Observed source types:

- RabbitMQ-consumed `ApplicationEventEnvelope`
- executor `ExecutionRecord`
- executor `DeadLetterRecord`

```csharp
ExecutionRecord(
  string ExternalOrderId,
  string ClientOrderId,
  string? ResourceId,
  string? CorrelationId,
  string? CommandEventId,
  string? ActionType,
  string? TradeIntentId,
  string? PublisherOrderId,
  string? Ticker,
  string? Side,
  string? Action,
  string? TargetPublisherOrderId,
  string? TargetClientOrderId,
  string? TargetExternalOrderId,
  string? Status,
  int? Quantity,
  decimal? LimitPriceDollars,
  decimal? NotionalDollars,
  string RawResponse,
  DateTimeOffset RecordedAtUtc)
```

```csharp
DeadLetterRecord(
  Guid Id,
  Guid SourceEventId,
  string SourceCategory,
  string SourceEventName,
  string? ResourceId,
  string? CorrelationId,
  string? IdempotencyKey,
  string DeadLetterQueue,
  int AttemptCount,
  string? ErrorType,
  string? ErrorMessage,
  string OriginalPayload,
  DateTimeOffset DeadLetteredAtUtc,
  DateTimeOffset? LastReplayedAtUtc,
  int ReplayCount)
```

### Field Mapping

| Source field | Canonical field | Rule |
|---|---|---|
| Executor envelope `Id` | `source_event_id`, `source_envelope_id` | Stable event identity. |
| `ExecutionRecord.ExternalOrderId` | `aliases[external_order_id]`, `aliases[kalshi_order_id]` | Preferred trade-attempt identity after submission. |
| `ExecutionRecord.ClientOrderId` | `aliases[client_order_id]` | Search and lifecycle stitching. |
| `ExecutionRecord.ResourceId` | `aliases[publisher_order_id]` or `aliases[trade_id]` | Preserved as source-specific alias. |
| `ExecutionRecord.CorrelationId` | `correlation_id` | Canonical lifecycle stitch key when present. |
| `ExecutionRecord.CommandEventId` | `aliases[command_event_id]` | Trade-attempt stitching. |
| `ExecutionRecord.TradeIntentId` | `aliases[trade_intent_id]` | Trade-intent stitching. |
| `ExecutionRecord.PublisherOrderId` | `aliases[publisher_order_id]` | Publisher-order stitching. |
| `ExecutionRecord.TargetPublisherOrderId` | `normalized_payload.target_publisher_order_id` | Preserved for cancel and close relationships. |
| `ExecutionRecord.TargetClientOrderId` | `normalized_payload.target_client_order_id` | Preserved for cancel and close relationships. |
| `ExecutionRecord.TargetExternalOrderId` | `normalized_payload.target_external_order_id` | Preserved for cancel and close relationships. |
| `ExecutionRecord.Status` | `source_status`, `normalized_payload.status` | Also contributes to terminal-state projection. |
| `ExecutionRecord.Quantity` | `normalized_payload.quantity` | Preserved on trade-attempt updates. |
| `ExecutionRecord.LimitPriceDollars` | `normalized_payload.limit_price` | Preserved on trade-attempt updates. |
| `ExecutionRecord.NotionalDollars` | `normalized_payload.notional_dollars` | Preserved for audit and analytics. |
| `ExecutionRecord.RawResponse` | `raw_payload` | Developer and admin only in read APIs. |
| `ExecutionRecord.RecordedAtUtc` | `occurred_at` | Execution record business timestamp. |
| `DeadLetterRecord.Id` | `source_event_id` for dead-letter fact | Stable dead-letter record identity. |
| `DeadLetterRecord.SourceEventId` | `normalized_payload.source_event_id` | Links dead-letter record to original envelope. |
| `DeadLetterRecord.AttemptCount` | `normalized_payload.attempt_count` | Required for retry and dead-letter analytics. |
| `DeadLetterRecord.ReplayCount` | `normalized_payload.replay_count`, `has_replay_observation` | Required for replay visibility. |
| `DeadLetterRecord.LastReplayedAtUtc` | `normalized_payload.last_replayed_at` | Replay timeline. |
| `DeadLetterRecord.DeadLetterQueue` | `broker_queue` | Preserved for ops surfaces. |
| `DeadLetterRecord.ErrorType` | `normalized_payload.error_type` | Failure taxonomy. |
| `DeadLetterRecord.ErrorMessage` | `normalized_payload.error_message` | Failure explanation. |
| `DeadLetterRecord.DeadLetteredAtUtc` | `occurred_at` | Dead-letter business time. |

### Gaps and Normalization Rules

- Standalone executor replay information comes from persistence records, not from the original envelope alone.
- The same logical lifecycle may appear in both the standalone executor repo and the richer executor subsystem embedded in the publisher repo. The dashboard treats them as separate source variants with compatible mappings.
- Dead-letter replay updates never create new canonical trade facts; they append observations and may reopen reconciliation gaps until the original fact stream converges.

## Source Variant: `quant-runtime-v1`

Observed source types in strategy repos:

```python
class TradeDecision(BaseModel):
    action: DecisionAction
    ticker: str
    title: str = ""
    side: PositionSide | None = None
    contracts: int = 0
    price: float = 0.0
    edge: float = 0.0
    reason: str = ""
    timestamp: datetime
```

```python
class TradeRecord(BaseModel):
    id: str
    ticker: str
    title: str
    side: PositionSide
    mode: str
    trade_type: Literal["OPEN", "CLOSE", "SETTLE"]
    contracts: int
    price: float
    cash_impact: float
    realized_pnl: float
    reason: str
    timestamp: datetime
```

```python
class LiveOrderRecord(BaseModel):
    order_id: str
    client_order_id: str
    ticker: str
    side: PositionSide
    action: str
    status: str
    order_type: str = "limit"
    mode: str
    limit_price: float
    contracts: int
    filled_contracts: int = 0
    remaining_contracts: int = 0
    reason: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None
    raw: dict = Field(default_factory=dict)
```

```python
class PerformanceSnapshot(BaseModel):
    realized_pnl_today: float
    unrealized_pnl: float
    total_pnl: float
    open_position_count: int
    trade_count_today: int
```

```python
class RuntimeSnapshot(BaseModel):
    mode: str
    halted: bool
    halt_reason: str | None = None
    last_scan_at: datetime | None = None
    latest_decisions: list[TradeDecision] = Field(default_factory=list)
    trades: list[TradeRecord] = Field(default_factory=list)
    positions: list[PositionRecord] = Field(default_factory=list)
    performance: PerformanceSnapshot
```

### Field Mapping

| Source field | Canonical field | Rule |
|---|---|---|
| `TradeDecision.action` | `canonical_family` | `SKIP` becomes `skip`; non-skip decisions become `decision`. |
| `TradeDecision.ticker` | `market_ticker` alias | Searchable alias and strategy market context. |
| `TradeDecision.title` | `normalized_payload.market_title` | Display context only. |
| `TradeDecision.side` | `normalized_payload.side` | Preserved when available. |
| `TradeDecision.contracts` | `normalized_payload.quantity` | Preserved when available. |
| `TradeDecision.price` | `normalized_payload.limit_price` | Preserved when available. |
| `TradeDecision.edge` | `normalized_payload.edge` | Decision analytics input. |
| `TradeDecision.reason` | `normalized_payload.reason_raw` | Required for skip and decision diagnostics. |
| `TradeDecision.timestamp` | `occurred_at` | Canonical strategy-decision time. |
| Deterministic hash of strategy + ticker + action + reason + timestamp | `correlation_id`, `aliases[decision_id]` when no better id exists | Required because current strategy repos do not expose a stable `decision_id`. |
| `LiveOrderRecord.order_id` | `aliases[trade_id]` or `aliases[source_order_id]` | Direct-strategy order identity. |
| `LiveOrderRecord.client_order_id` | `aliases[client_order_id]` | Search and correlation input. |
| `LiveOrderRecord.status` | `source_status` | Preserved for lifecycle debugging. |
| `LiveOrderRecord.created_at` / `updated_at` | `occurred_at` on order observations | `updated_at` wins when present. |
| `LiveOrderRecord.raw` | `raw_payload` | Developer and admin only in read APIs. |
| `TradeRecord.id` | `aliases[trade_record_id]` | Strategy-local closed or settled trade identity. |
| `TradeRecord.trade_type` | `canonical_family` and lifecycle transition | `OPEN` / `CLOSE` / `SETTLE` affect fill, position, and settlement projections. |
| `TradeRecord.realized_pnl` | `normalized_payload.realized_pnl_source` | Used for snapshot-versus-reconstruction reconciliation. |
| `TradeRecord.timestamp` | `occurred_at` | Canonical trade-record time. |
| `PositionRecord.last_marked_price` | `normalized_payload.mark_price` | Mark-to-market input. |
| `PositionRecord.updated_at` | `occurred_at` on position snapshots | Position freshness input. |
| `PerformanceSnapshot.realized_pnl_today` | `normalized_payload.realized_pnl_source` | Strategy-level direct snapshot input. |
| `PerformanceSnapshot.unrealized_pnl` | `normalized_payload.unrealized_pnl_source` | Strategy-level direct snapshot input. |
| `RuntimeSnapshot.last_scan_at` | `published_at` for collector sample | Collector observation time. |
| `RuntimeSnapshot.halted`, `halt_reason` | `heartbeat` or `alert` context | Used to derive strategy health and degraded signals. |

### Gaps and Normalization Rules

- Strategy repos do not expose stable `decision_id` values today. The dashboard synthesizes deterministic ids and marks them as adapter-derived.
- Direct strategy payloads do not contain RabbitMQ exchange, queue, routing, redelivery, or delivery-tag metadata. Those canonical fields stay null and the source path is explicitly marked as direct.
- BTC may contribute both direct strategy read models and centralized publisher lifecycles for the same market activity. The reconciliation layer prefers centralized identities when they can be linked and preserves both observation paths.

## Skip-Only and No-Trade Diagnostics

First-class inputs include:

- `TradeDecision` with `action == SKIP`
- `RuntimeSnapshot.latest_decisions` rows that resolve to skips
- strategy debug or candidate payloads that expose explicit skipped-trade arrays or skip counts

### Field Mapping

| Source field | Canonical field | Rule |
|---|---|---|
| `TradeDecision.action == SKIP` | `canonical_family = skip` | Creates a first-class skip fact even with no downstream order. |
| `TradeDecision.reason` | `reason_raw`, `skip_category`, `skip_code` | Category and optional code are derived by mapping rules; raw text is preserved verbatim. |
| `TradeDecision.timestamp` | `occurred_at` | Skip event time. |
| `ticker` and strategy registry symbol | `market_ticker`, `symbol` | Used in skip analytics. |
| source debug `skipCount` or `skippedTrades[]` | `normalized_payload.skip_batch_context` | Preserved as supporting metadata only, not as the primary fact identity. |

### Gaps and Normalization Rules

- Skip events are never inferred from the absence of orders.
- Skip taxonomy mapping is configuration-driven and may produce `skip_category = other` when raw text does not match a known rule.

## Source Variant: `rabbitmq-management-v1`

Observed and required payload subset from RabbitMQ Management HTTP queue endpoints:

- `name`
- `messages`
- `messages_ready`
- `messages_unacknowledged`
- `consumers`
- `idle_since`
- `message_stats.publish_details.rate`
- `message_stats.deliver_get_details.rate`
- `message_stats.ack_details.rate`
- `message_stats.redeliver_details.rate`

### Field Mapping

| Source field | Canonical field | Rule |
|---|---|---|
| `name` | `queue_name` | Primary queue identifier. |
| `messages` | `message_count` | Total visible backlog. |
| `messages_ready` | `messages_ready` | Queue-ready subset for ops view. |
| `messages_unacknowledged` | `messages_unacknowledged` | In-flight consumer visibility. |
| `consumers` | `consumer_count` | Used for stale-consumer alerts. |
| `idle_since` | `idle_since` | Used with prior samples to infer freshness gaps. |
| `message_stats.publish_details.rate` | `publish_rate` | Throughput context. |
| `message_stats.deliver_get_details.rate` | `deliver_rate` | Consumer throughput context. |
| `message_stats.ack_details.rate` | `ack_rate` | Acknowledgement throughput context. |
| `message_stats.redeliver_details.rate` | `redeliver_rate` | Redelivery pressure context. |
| Poll timestamp | `sampled_at`, `received_at` | Management poll observation time. |

### Gaps and Normalization Rules

- RabbitMQ Management does not directly provide per-message published timestamps. Backlog-age alerts prefer application diagnostics when available and otherwise use queue-nonempty duration and oldest known canonical event age as fallbacks.
- Management API samples are metrics observations, not business facts, and therefore normalize into `queue_metric` and `heartbeat` families rather than decision or trade families.

## Shared Normalization Rules

- Canonical `correlation_id` is the single lifecycle stitch key, but missing strategy ids are synthesized deterministically and marked as adapter-derived.
- Deduplication uses `source_system + source_event_name + source_event_id` when present; otherwise the adapter falls back to a deterministic semantic fingerprint that includes canonical family, lifecycle stage, strategy, market, and event time.
- Every observation stores `source_variant` and `adapter_version` so future source-contract drift is queryable.
- Mixed-source lifecycles explicitly preserve `source_path_mode` so the UI can show whether a fact came from a centralized publisher path, a direct strategy collector, or both.
