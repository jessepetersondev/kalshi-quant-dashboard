# Normalized Events

Canonical events capture durable lifecycle facts. Event observations capture how
and when each upstream source delivered those facts.

## Canonical Event Fields

- canonical family and lifecycle stage
- canonical ids and source-local aliases
- source path mode
- occurred, published, received, and first-seen timestamps
- replay or redelivery kind
- degraded or reconciliation status
- exchange, queue, routing key, delivery tag, and adapter version metadata

## Observation Fields

- source envelope id
- source delivery ordinal or sequence
- redelivery flag
- replay, backfill, or resync marker
- schema validation outcome

Use event observations for audit and troubleshooting. Use canonical events for
history, search, alerts, and analytics.
