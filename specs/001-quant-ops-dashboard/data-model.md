# Data Model: Kalshi Quant Dashboard

## Canonical Enumerations

### `source_system`

- `strategy_adapter`
- `publisher`
- `executor`
- `rabbitmq_management`
- `dashboard`

### `source_path_mode`

- `publisher_only`
- `direct_only`
- `hybrid`

### `canonical_family`

- `decision`
- `trade`
- `trade_intent`
- `skip`
- `publisher_event`
- `queue_metric`
- `executor_event`
- `fill`
- `position_snapshot`
- `pnl_snapshot`
- `heartbeat`
- `alert`
- `audit_event`

### `lifecycle_stage`

- `strategy_emission`
- `skip`
- `intent`
- `publisher`
- `queue`
- `executor`
- `submission`
- `fill`
- `position`
- `pnl`
- `heartbeat`
- `alert`
- `terminal`
- `dead_letter`

### `replay_kind`

- `live`
- `redelivery`
- `replay`
- `backfill`
- `resync`

### `reconciliation_status`

- `pending`
- `consistent`
- `partial`
- `gap_detected`
- `corrected`

### `degraded_reason`

- `missing_source_identifier`
- `partial_upstream_payload`
- `missing_terminal_event`
- `stale_pnl`
- `stale_heartbeat`
- `queue_metrics_unavailable`
- `reconciliation_gap`
- `adapter_synthesized_identity`
- `raw_source_mismatch`
- `backfill_pending`

### `skip_category`

- `market_conditions`
- `risk_guardrail`
- `position_state`
- `timing_window`
- `configuration`
- `infrastructure`
- `data_quality`
- `operator_control`
- `other`

### `alert_type`

- `queue_backlog_age`
- `queue_depth`
- `dlq_growth`
- `missing_heartbeat`
- `stale_consumer`
- `ingest_failure`
- `stale_pnl`
- `missing_terminal_event`
- `reconnect_degraded`

### `alert_status`

- `open`
- `acknowledged`
- `resolved`
- `suppressed`

### `alert_severity`

- `info`
- `warning`
- `critical`

### `role`

- `operator`
- `developer`
- `admin`

### `detail_level`

- `standard`
- `debug`

### `subject_type`

- `user`
- `role`
- `global`

### `policy_rule_type`

- `strategy_scope`
- `raw_payload`
- `debug_stream`
- `privileged_audit`
- `admin_surface`

### `policy_effect`

- `allow`
- `deny`

### `admin_surface`

- `alert_rules`
- `feature_flags`
- `access_policies`
- `audit_logs`

### `export_resource`

- `decisions`
- `trades`
- `skips`
- `alerts`
- `pnl`
- `operations`
- `audit_logs`

### `export_column_profile`

- `summary`
- `detailed`
- `raw_payload`

### `valuation_source`

- `strategy_snapshot`
- `lifecycle_reconstruction`
- `hybrid`

### `position_status`

- `open`
- `partially_closed`
- `closed`
- `settled`
- `degraded`

## Configuration and Registry Entities

### Strategy

- Purpose: Registry entry for each monitored strategy repo matching `kalshi-${cryptoSymbol}-quant`.
- Primary key: `strategy_id` (slug such as `btc`, `eth`, `sol`, `xrp`)
- Fields:
  - `display_name`
  - `repo_name`
  - `symbol`
  - `enabled`
  - `seeded_initial_strategy` boolean
  - `source_path_mode`
  - `default_source_binding_id`
  - `health_status`
  - `latest_heartbeat_at`
  - `latest_pnl_snapshot_at`
  - `created_at`
  - `updated_at`
- Validation rules:
  - `repo_name` must match `^kalshi-[a-z0-9]+-quant$`
  - `symbol` must be uppercase and unique
  - `seeded_initial_strategy` may be true for BTC, ETH, SOL, XRP only in first-release fixtures
- Relationships:
  - one-to-many with `strategy_endpoint`
  - one-to-many with `strategy_source_binding`
  - one-to-many with `decision_lifecycle`
  - one-to-many with `market_position_lifecycle`

### Source Contract Binding

- Purpose: Generic contract profile for a source variant, used to avoid asset-specific code branches.
- Primary key: `source_binding_id`
- Fields:
  - `source_system`
  - `source_variant` such as `publisher-envelope-v1`, `standalone-executor-v1`, `quant-runtime-v1`, `rabbitmq-management-v1`
  - `adapter_version`
  - `contract_version`
  - `transport_type` (`rabbitmq_consumer`, `http_poll`, `seed_fixture`)
  - `capabilities` jsonb
  - `identity_rules` jsonb
  - `ordering_rules` jsonb
  - `normalization_rules` jsonb
  - `enabled`
  - `created_at`
  - `updated_at`
- Relationships:
  - one-to-many with `strategy_source_binding`
  - one-to-many with `strategy_endpoint`

### Strategy Source Binding

- Purpose: Connects a strategy to one or more source contract profiles.
- Primary key: `strategy_source_binding_id`
- Fields:
  - `strategy_id`
  - `source_binding_id`
  - `priority`
  - `enabled`
  - `used_for_decisions` boolean
  - `used_for_trades` boolean
  - `used_for_skips` boolean
  - `used_for_positions` boolean
  - `used_for_pnl` boolean
  - `used_for_heartbeats` boolean
- Validation rules:
  - multiple bindings are allowed for hybrid strategies
  - binding priorities must be unique within a strategy

### Strategy Endpoint

- Purpose: Runtime connection details for a strategy or operational source.
- Primary key: `endpoint_id`
- Fields:
  - `strategy_id` nullable for non-strategy sources
  - `source_binding_id`
  - `base_url` nullable
  - `queue_name` nullable
  - `exchange_name` nullable
  - `routing_key_pattern` nullable
  - `poll_schedule`
  - `auth_mode`
  - `enabled`
  - `last_success_at`
  - `last_error_at`
  - `last_error_message`
- Relationships:
  - belongs to `strategy` optionally
  - belongs to `source_contract_binding`
  - one-to-many with `ingest_checkpoint`

### Alert Rule Config

- Purpose: Persisted, configurable alert threshold and evaluation rules.
- Primary key: `alert_rule_id`
- Fields:
  - `alert_type`
  - `scope_type` (`global`, `strategy`, `component`, `queue`)
  - `scope_key`
  - `severity`
  - `comparison_operator`
  - `threshold_value`
  - `threshold_unit`
  - `evaluation_window_seconds`
  - `consecutive_failures_required`
  - `cooldown_seconds`
  - `enabled`
  - `config_source` (`seed`, `admin_override`)
  - `created_by_user_id` nullable
  - `updated_by_user_id` nullable
  - `created_at`
  - `updated_at`
- Validation rules:
  - one active default rule per `alert_type + scope_type + scope_key`
  - admin updates must create `audit_log` entries

### Feature Flag

- Purpose: Runtime-toggled product flags controlled by admins.
- Primary key: `feature_flag_key`
- Fields:
  - `description`
  - `enabled`
  - `scope_type`
  - `scope_key`
  - `version`
  - `validation_schema_key`
  - `last_validation_error` nullable
  - `updated_by_user_id`
  - `updated_at`
  - `last_audit_log_id` nullable
- Validation rules:
  - updates require optimistic concurrency on `version`
  - accepted and rejected mutations create `audit_log` entries

### User

- Purpose: Authenticated dashboard principal.
- Primary key: `user_id`
- Fields:
  - `email`
  - `display_name`
  - `identity_provider_subject`
  - `is_active`
  - `created_at`
  - `last_login_at`

### Role Binding

- Purpose: Base role and coarse strategy-scope assignment for a principal.
- Primary key: `role_binding_id`
- Fields:
  - `user_id`
  - `role`
  - `strategy_scope` jsonb
  - `binding_source` (`seed`, `idp_sync`, `admin_override`)
  - `is_active`
  - `created_at`
  - `updated_at`
- Validation rules:
  - only `admin` may grant or edit bindings
  - strategy scope may be `["*"]` for global roles
  - role bindings establish the maximum base role and coarse strategy reach, but they are not the sole authorization model

### Access Policy

- Purpose: Admin-managed policy container that targets users, roles, or global subjects and versions policy changes over time.
- Primary key: `access_policy_id`
- Fields:
  - `name`
  - `description`
  - `subject_type`
  - `subject_key`
  - `precedence`
  - `enabled`
  - `version`
  - `created_by_user_id`
  - `updated_by_user_id`
  - `created_at`
  - `updated_at`
  - `last_audit_log_id` nullable
- Validation rules:
  - higher `precedence` policies evaluate before lower-precedence policies
  - updates require optimistic concurrency on `version`
  - only `admin` may create or update policies
- Relationships:
  - one-to-many with `access_policy_rule`
  - one-to-many with `export_scope_grant`
  - one-to-many with `audit_log`

### Access Policy Rule

- Purpose: Explicit allow or deny rule controlling strategy scope, raw payload visibility, debug subscriptions, privileged audit visibility, or admin surfaces.
- Primary key: `access_policy_rule_id`
- Fields:
  - `access_policy_id`
  - `rule_type`
  - `effect`
  - `strategy_scope` jsonb nullable
  - `admin_surfaces` jsonb nullable
  - `enabled`
  - `notes` nullable
  - `created_at`
  - `updated_at`
- Validation rules:
  - deny rules override allow rules at the same precedence
  - `admin_surfaces` is required when `rule_type = admin_surface`
  - `strategy_scope` is required when `rule_type = strategy_scope`

### Export Scope Grant

- Purpose: Source of truth for approved export resources and column profiles used by both UI gating and backend export enforcement.
- Primary key: `export_scope_id`
- Fields:
  - `access_policy_id`
  - `resource_name`
  - `strategy_scope` jsonb
  - `column_profile`
  - `allow_privileged_columns` boolean default false
  - `enabled`
  - `created_at`
  - `updated_at`
- Validation rules:
  - export grants cannot authorize strategies outside the maximum scope implied by matching role bindings
  - `allow_privileged_columns` requires admin-capable policy context

### Effective Capability Result

- Purpose: Versioned resolved capability payload returned to sessions and reused at every REST, SSE, export, and admin authorization check.
- Primary key: `effective_capability_key`
- Fields:
  - `user_id`
  - `resolved_role`
  - `strategy_scope` jsonb
  - `detail_level_max`
  - `can_view_raw_payloads`
  - `can_view_privileged_audit_logs`
  - `can_manage_alert_rules`
  - `can_manage_feature_flags`
  - `can_manage_access_policies`
  - `allowed_export_resources` jsonb
  - `resolution_version`
  - `resolved_at`
  - `role_binding_version_fingerprint`
  - `access_policy_version_fingerprint`
- Validation rules:
  - derived from active role bindings plus enabled matching policies and export grants
  - the same resolved capability payload must back frontend gating and backend authorization decisions

## Ingestion and Reconciliation Entities

### Event Observation

- Purpose: Append-only record of every observed delivery, poll sample, replay, backfill, or redelivery before and after deduplication.
- Primary key: `event_observation_id` (UUID)
- Fields:
  - `source_system`
  - `source_variant`
  - `source_repo`
  - `source_event_name`
  - `source_event_id` nullable
  - `source_envelope_id` nullable
  - `correlation_id_candidate`
  - `dedup_key_candidate`
  - `strategy_id` nullable
  - `replay_kind`
  - `is_redelivered`
  - `is_backfill`
  - `source_sequence` nullable
  - `source_delivery_ordinal` nullable
  - `published_at` nullable
  - `received_at`
  - `broker_exchange` nullable
  - `broker_queue` nullable
  - `broker_routing_key` nullable
  - `broker_delivery_tag` nullable
  - `adapter_version`
  - `raw_payload` jsonb
  - `payload_hash`
  - `accepted_as_new_fact` boolean
  - `canonical_event_id` nullable until normalization completes
  - `schema_validation_error` nullable
- Validation rules:
  - one row per seen observation
  - `received_at` is mandatory even for poll-based inputs
  - raw payload must be preserved even for rejected observations
- Relationships:
  - many-to-one optional `canonical_event`

### Canonical Event

- Purpose: Deduplicated normalized fact table backing live and historical parity.
- Primary key: `canonical_event_id` (UUID)
- Unique constraints:
  - `dedup_key`
- Fields:
  - `correlation_id`
  - `strategy_id` nullable
  - `canonical_family`
  - `lifecycle_stage`
  - `source_system`
  - `source_variant`
  - `source_repo`
  - `source_event_name`
  - `source_event_id` nullable
  - `source_envelope_id` nullable
  - `source_contract_version` nullable
  - `adapter_version`
  - `dedup_key`
  - `occurred_at`
  - `published_at` nullable
  - `first_seen_at`
  - `last_seen_at`
  - `source_sequence_first` nullable
  - `source_delivery_ordinal_first` nullable
  - `has_redelivery`
  - `has_replay`
  - `has_backfill`
  - `broker_exchange_first` nullable
  - `broker_queue_first` nullable
  - `broker_routing_key_first` nullable
  - `broker_delivery_tag_first` nullable
  - `observation_count`
  - `degraded_reasons` text[]
  - `reconciliation_status`
  - `source_path_mode`
  - `normalized_payload` jsonb
  - `raw_payload` jsonb
- Validation rules:
  - `correlation_id` may be adapter-derived but must never be empty
  - `first_seen_at` is immutable after insert
  - duplicates update summary fields such as `last_seen_at`, `observation_count`, and replay flags but do not change canonical identity
- Relationships:
  - one-to-many with `event_observation`
  - one-to-many with `identifier_alias`

### Identifier Alias

- Purpose: Makes all source-local identifiers searchable without promoting them to the canonical key.
- Primary key: `identifier_alias_id`
- Fields:
  - `canonical_event_id`
  - `correlation_id`
  - `alias_type`
  - `alias_value`
  - `source_system`
  - `is_primary_for_event`
- Common `alias_type` values:
  - `decision_id`
  - `trade_id`
  - `trade_intent_id`
  - `publisher_order_id`
  - `command_event_id`
  - `client_order_id`
  - `external_order_id`
  - `kalshi_order_id`
  - `routing_key`
  - `market_ticker`
  - `symbol`
  - `idempotency_key`
  - `trade_record_id`
- Indexes:
  - unique on (`alias_type`, `alias_value`, `canonical_event_id`)
  - search index on (`alias_type`, `alias_value`)

### Ingest Checkpoint

- Purpose: Tracks adapter progress for polling, consumer cursors, replay, and backfill.
- Primary key: `checkpoint_id`
- Fields:
  - `endpoint_id`
  - `checkpoint_type` (`poll_cursor`, `queue_offset`, `backfill_window`, `resync_cursor`)
  - `cursor_value`
  - `captured_at`
  - `last_success_at`
  - `last_error_at`
  - `last_error_message`

### Reconciliation Gap

- Purpose: Explicitly records mismatches between live observations, history, or expected lifecycle terminals.
- Primary key: `gap_id`
- Fields:
  - `correlation_id`
  - `strategy_id` nullable
  - `gap_type` (`missing_terminal_event`, `history_mismatch`, `alias_conflict`, `pnl_disagreement`, `late_backfill`)
  - `affected_family`
  - `detected_at`
  - `resolved_at` nullable
  - `status`
  - `expected_state` jsonb
  - `actual_state` jsonb
  - `resolution_notes` nullable
- Relationships:
  - many-to-many with `canonical_event` through a join table if needed

### Projection Change

- Purpose: Durable, monotonic cursor backing SSE resume and live-to-history convergence.
- Primary key: `projection_change_id` (bigint)
- Fields:
  - `channel`
  - `record_type`
  - `record_key`
  - `detail_level_minimum`
  - `strategy_id` nullable
  - `correlation_id` nullable
  - `effective_occurred_at`
  - `emitted_at`
  - `projection_version`
  - `change_kind` (`snapshot`, `upsert`, `status`, `gap`, `resync_required`)
  - `payload` jsonb
- Validation rules:
  - emitted only after canonical write and read-model update commit
  - ordered strictly by `projection_change_id`

## Query and Analytics Read Models

### Decision Lifecycle

- Purpose: Query-optimized read model for the Decisions page and decision detail views.
- Primary key: `correlation_id`
- Fields:
  - `strategy_id`
  - `symbol`
  - `market_ticker`
  - `decision_action`
  - `decision_reason_raw`
  - `decision_reason_summary`
  - `decision_occurred_at`
  - `current_lifecycle_stage`
  - `current_outcome_status`
  - `source_path_mode`
  - `is_skipped`
  - `skip_category` nullable
  - `skip_code` nullable
  - `is_degraded`
  - `latest_event_at`
  - `latest_first_seen_at`
  - `latest_published_at` nullable
  - `search_document`
- Validation rules:
  - exactly one row per `correlation_id`
  - timeline ordering uses `occurred_at`, then source ordering metadata when available, then `first_seen_at`

### Trade Attempt

- Purpose: Represents one executable order attempt within a correlation lifecycle.
- Primary key: `trade_attempt_key`
- Fields:
  - `correlation_id`
  - `strategy_id`
  - `attempt_index`
  - `source_path_mode`
  - `publisher_order_id` nullable
  - `trade_intent_id` nullable
  - `command_event_id` nullable
  - `client_order_id` nullable
  - `external_order_id` nullable
  - `kalshi_order_id` nullable
  - `market_ticker`
  - `side`
  - `action_type`
  - `quantity`
  - `limit_price`
  - `status`
  - `publish_status` nullable
  - `last_result_status` nullable
  - `retry_count`
  - `first_seen_at`
  - `latest_seen_at`
  - `terminal_at` nullable
  - `is_dead_lettered`
  - `is_degraded`
- Identity rule:
  - precedence: `publisher_order_id`, `command_event_id`, `external_order_id`, `client_order_id`, semantic fallback hash

### Fill Fact

- Purpose: Represents fills and partial fills attached to a trade attempt.
- Primary key: `fill_fact_id`
- Fields:
  - `trade_attempt_key`
  - `source_fill_id` nullable
  - `fill_sequence`
  - `filled_quantity`
  - `fill_price`
  - `fee_amount`
  - `fill_status`
  - `occurred_at`
  - `source_path_mode`
- Validation rules:
  - `fill_sequence` must be monotonic within a trade attempt when provided

### Market Position Lifecycle

- Purpose: Canonical PnL attribution unit across opens, partial closes, and settlement.
- Primary key: `position_lifecycle_id`
- Fields:
  - `strategy_id`
  - `symbol`
  - `market_ticker`
  - `side`
  - `status`
  - `opened_at`
  - `last_activity_at`
  - `closed_at` nullable
  - `settled_at` nullable
  - `open_quantity`
  - `closed_quantity`
  - `settled_quantity`
  - `remaining_quantity`
  - `average_entry_price`
  - `last_mark_price` nullable
  - `last_mark_at` nullable
  - `mark_stale` boolean
  - `mark_source` nullable
  - `realized_pnl_net_reconstructed`
  - `unrealized_pnl_net_reconstructed`
  - `fees_total_allocated`
  - `valuation_source`
  - `direct_snapshot_realized_pnl` nullable
  - `direct_snapshot_unrealized_pnl` nullable
  - `pnl_disagreement_status` (`match`, `within_tolerance`, `mismatch`, `snapshot_missing`)
  - `last_reconciled_at`
- Validation rules:
  - partial fills and closes update quantities without closing the lifecycle until `remaining_quantity == 0`
  - settlement can occur after close and updates terminal attribution

### Position Snapshot

- Purpose: Periodic source-native position state sample preserved separately from reconstructed lifecycle.
- Primary key: `position_snapshot_id`
- Fields:
  - `strategy_id`
  - `market_ticker`
  - `side`
  - `contracts_open`
  - `average_entry_price`
  - `mark_price`
  - `snapshot_at`
  - `source_path_mode`
  - `raw_position_payload` jsonb

### PnL Snapshot

- Purpose: Queryable summary for strategy, symbol, market, and portfolio scopes.
- Primary key: `pnl_snapshot_id`
- Fields:
  - `scope_type` (`strategy`, `symbol`, `market`, `portfolio`)
  - `scope_key`
  - `bucket_type` (`24h`, `7d`, `30d`, `mtd`, `ytd`, `all_time`, `custom`)
  - `range_start_utc`
  - `range_end_utc`
  - `realized_pnl_net`
  - `unrealized_pnl_net`
  - `fees_total`
  - `wins`
  - `losses`
  - `is_stale`
  - `is_partial`
  - `freshness_timestamp`
  - `valuation_source_summary`
  - `disagreement_count`
  - `generated_at`
- Validation rules:
  - custom ranges use range-end valuation for unrealized PnL
  - stale or partial inputs never suppress last known values; they only mark them degraded

### Queue Metric Snapshot

- Purpose: Durable queue and broker health sample for operations and alerting.
- Primary key: `queue_metric_snapshot_id`
- Fields:
  - `component_name`
  - `queue_name`
  - `exchange_name` nullable
  - `message_count`
  - `messages_ready`
  - `messages_unacknowledged`
  - `consumer_count`
  - `oldest_message_age_seconds` nullable
  - `publish_rate` nullable
  - `deliver_rate` nullable
  - `ack_rate` nullable
  - `redeliver_rate` nullable
  - `dlq_message_count` nullable
  - `dlq_growth_total` nullable
  - `publish_failure_count` nullable
  - `unroutable_count` nullable
  - `reconnect_status` nullable
  - `sampled_at`

### Heartbeat Status

- Purpose: Current freshness state for strategies, publisher, executor, and collectors.
- Primary key: `heartbeat_key`
- Fields:
  - `subject_type`
  - `subject_key`
  - `source_system`
  - `last_seen_at`
  - `expected_interval_seconds`
  - `status`
  - `stale_at`
  - `latest_correlation_id` nullable

### Alert Incident

- Purpose: Visible alert and incident record reachable from lists, drawers, and `/alerts/:alertId`.
- Primary key: `alert_id`
- Fields:
  - `alert_rule_id` nullable
  - `alert_type`
  - `severity`
  - `status`
  - `component_type`
  - `component_key`
  - `strategy_id` nullable
  - `correlation_id` nullable
  - `summary`
  - `description`
  - `threshold_context` jsonb
  - `first_seen_at`
  - `latest_seen_at`
  - `acknowledged_at` nullable
  - `acknowledged_by_user_id` nullable
  - `resolved_at` nullable
  - `detail_context` jsonb
  - `last_projection_change_id`
- Relationships:
  - belongs to `alert_rule_config` optionally
  - one-to-many with `audit_log`

### Audit Log

- Purpose: Immutable audit trail for auth, RBAC, exports, alert actions, and admin changes.
- Primary key: `audit_log_id`
- Fields:
  - `actor_user_id` nullable
  - `actor_role` nullable
  - `action_type`
  - `target_type`
  - `target_key`
  - `strategy_scope` jsonb
  - `result` (`allowed`, `denied`, `succeeded`, `failed`)
  - `reason` nullable
  - `before_state` jsonb nullable
  - `after_state` jsonb nullable
  - `target_version` nullable
  - `metadata` jsonb
  - `occurred_at`

## Derived Views

- `overview_snapshot_view`: landing-page summary of global health, aggregate PnL, live feeds, queue health, and recent alerts
- `strategy_summary_view`: strategy list cards plus compare-mode header metrics
- `decision_table_view`: server-paged decisions query projection
- `trade_table_view`: server-paged trades and order-lifecycle projection
- `skip_breakdown_view`: skip taxonomy and root-cause aggregation
- `pnl_timeseries_view`: UTC-bucketed analytics projection
- `pnl_reconciliation_view`: snapshot-versus-reconstruction disagreement view
- `operations_queue_view`: queue health and bottleneck projection
- `alert_detail_view`: alert detail page and drawer payload projection
- `system_health_view`: health status across publisher, executor, strategies, collectors, and ingestion
- `access_policy_admin_view`: admin listing and detail projection for access policies, rules, export grants, and audit references
- `feature_flag_admin_view`: admin listing and detail projection for feature flags and version state, with mutation history retrieved through the audit-log surface
- `effective_capability_view`: resolved per-session capability projection used by session bootstrap and authorization checks

## Ordered Convergence Notes

- `event_observation` retains every redelivery, replay, backfill, and resync observation.
- `canonical_event` retains the deduplicated fact plus rolled-up ordering and replay summary fields.
- `projection_change` is the live-stream contract boundary and is emitted only after canonical persistence and read-model updates.
- Historical APIs and live SSE both read from the same canonical and projection-backed read models, which is how live-to-history convergence is guaranteed.

## Authorization Resolution Notes

- `role_binding` defines the base role and coarse strategy reach.
- `access_policy` and `access_policy_rule` refine capability surfaces by allow or deny semantics.
- `export_scope_grant` is the durable source of truth for approved export resources and column profiles.
- `effective_capability_result` is resolved from the active role bindings plus enabled matching policies and grants, then returned through the session contract and reused by REST, SSE, export, and admin authorization paths.
