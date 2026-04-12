# Source Compatibility Matrix

## Strategy Repos

- `kalshi-btc-quant`: hybrid source using direct runtime endpoints plus publisher-backed lifecycle facts.
- `kalshi-eth-quant`: direct runtime source using FastAPI `health`, `status`, `positions`, `trades`, `orders`, `pnl`, and `realized pnl` endpoints.
- `kalshi-sol-quant`: direct runtime source plus explicit `no-trade-diagnostics`.
- `kalshi-xrp-quant`: direct runtime source using the shared FastAPI surface.

## Centralized Sources

- `kalshi-integration-event-publisher`: RabbitMQ publisher envelopes and result-consumer operational signals.
- `kalshi-integration-executor`: execution records, dead-letter records, and executor routing semantics.
- RabbitMQ Management API: queue depth, consumer count, and backlog age sampling that the collector transforms into normalized queue-metric observations before ingest.

## Normalization Rules

- Publisher and executor envelopes deduplicate on `source_system + source_event_name + source_event_id`.
- Strategy decision payloads synthesize a deterministic source identity when no native decision id exists.
- Strategy position payloads are normalized into canonical `position_snapshot` facts and persisted directly.
- Skip-only and no-trade diagnostics are normalized into canonical `skip` facts and persisted directly.
- Queue metrics and heartbeats remain first-class canonical families, not inferred status.
