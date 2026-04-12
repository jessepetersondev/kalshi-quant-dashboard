do $$
begin
    create type role as enum ('operator', 'developer', 'admin');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type source_system as enum ('strategy_adapter', 'publisher', 'executor', 'rabbitmq_management', 'dashboard');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type source_path_mode as enum ('publisher_only', 'direct_only', 'hybrid');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type canonical_family as enum ('decision', 'trade', 'trade_intent', 'skip', 'publisher_event', 'queue_metric', 'executor_event', 'fill', 'position_snapshot', 'pnl_snapshot', 'heartbeat', 'alert', 'audit_event');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type lifecycle_stage as enum ('strategy_emission', 'skip', 'intent', 'publisher', 'queue', 'executor', 'submission', 'fill', 'position', 'pnl', 'heartbeat', 'alert', 'terminal', 'dead_letter');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type replay_kind as enum ('live', 'redelivery', 'replay', 'backfill', 'resync');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type reconciliation_status as enum ('pending', 'consistent', 'partial', 'gap_detected', 'corrected');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type subject_type as enum ('user', 'role', 'global');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type policy_rule_type as enum ('strategy_scope', 'raw_payload', 'debug_stream', 'privileged_audit', 'admin_surface');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type policy_effect as enum ('allow', 'deny');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type admin_surface as enum ('alert_rules', 'feature_flags', 'access_policies', 'audit_logs');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type export_resource as enum ('decisions', 'trades', 'skips', 'alerts', 'pnl', 'operations', 'audit_logs');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type export_column_profile as enum ('summary', 'detailed', 'raw_payload');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type alert_type as enum ('queue_backlog_age', 'queue_depth', 'dlq_growth', 'missing_heartbeat', 'stale_consumer', 'ingest_failure', 'stale_pnl', 'missing_terminal_event', 'reconnect_degraded');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type alert_status as enum ('open', 'acknowledged', 'resolved', 'suppressed');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type alert_severity as enum ('info', 'warning', 'critical');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type skip_category as enum ('market_conditions', 'risk_guardrail', 'position_state', 'timing_window', 'configuration', 'infrastructure', 'data_quality', 'operator_control', 'other');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type detail_level as enum ('standard', 'debug');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type position_status as enum ('open', 'partially_closed', 'closed', 'settled', 'degraded');
exception
    when duplicate_object then null;
end
$$;

do $$
begin
    create type valuation_source as enum ('strategy_snapshot', 'lifecycle_reconstruction', 'hybrid');
exception
    when duplicate_object then null;
end
$$;

create table if not exists users (
    user_id text primary key,
    email text not null unique,
    display_name text not null,
    default_role role not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists role_bindings (
    role_binding_id text primary key,
    user_id text not null references users(user_id) on delete cascade,
    role role not null,
    strategy_scope jsonb not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists source_bindings (
    source_binding_id text primary key,
    source_system source_system not null,
    source_variant text not null,
    adapter_version text not null,
    contract_version text not null,
    transport_type text not null,
    capabilities jsonb not null,
    identity_rules jsonb not null,
    ordering_rules jsonb not null,
    normalization_rules jsonb not null,
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists strategies (
    strategy_id text primary key,
    display_name text not null,
    repo_name text not null unique,
    symbol text not null unique,
    enabled boolean not null default true,
    seeded_initial_strategy boolean not null default false,
    source_path_mode source_path_mode not null,
    default_source_binding_id text,
    health_status text not null default 'unknown',
    latest_heartbeat_at timestamptz,
    latest_pnl_snapshot_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists strategy_source_bindings (
    strategy_source_binding_id text primary key,
    strategy_id text not null references strategies(strategy_id) on delete cascade,
    source_binding_id text not null references source_bindings(source_binding_id) on delete cascade,
    priority integer not null,
    enabled boolean not null default true,
    used_for_decisions boolean not null default false,
    used_for_trades boolean not null default false,
    used_for_skips boolean not null default false,
    used_for_positions boolean not null default false,
    used_for_pnl boolean not null default false,
    used_for_heartbeats boolean not null default false,
    used_for_operations boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists strategy_endpoints (
    endpoint_id text primary key,
    strategy_id text references strategies(strategy_id) on delete cascade,
    source_binding_id text not null references source_bindings(source_binding_id),
    base_url text not null,
    health_path text not null,
    status_path text not null,
    positions_path text not null,
    trades_path text not null,
    orders_path text not null,
    pnl_path text not null,
    realized_pnl_path text not null,
    skip_diagnostics_path text,
    dashboard_live_path text,
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists access_policies (
    access_policy_id text primary key,
    subject_type subject_type not null,
    subject_key text not null,
    name text not null,
    precedence integer not null,
    enabled boolean not null default true,
    version integer not null default 0,
    updated_by_user_id text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists access_policy_rules (
    access_policy_rule_id text primary key,
    access_policy_id text not null references access_policies(access_policy_id) on delete cascade,
    rule_type policy_rule_type not null,
    effect policy_effect not null,
    strategy_scope jsonb,
    admin_surface admin_surface,
    created_at timestamptz not null default now()
);

create table if not exists export_scope_grants (
    export_scope_grant_id text primary key,
    access_policy_id text not null references access_policies(access_policy_id) on delete cascade,
    resource export_resource not null,
    strategy_scope jsonb not null,
    column_profile export_column_profile not null,
    created_at timestamptz not null default now()
);

create table if not exists effective_capability_snapshots (
    effective_capability_snapshot_id text primary key,
    user_id text not null,
    resolved_role role not null,
    strategy_scope jsonb not null,
    detail_level_max detail_level not null,
    can_view_raw_payloads boolean not null,
    can_view_privileged_audit_logs boolean not null,
    can_manage_alert_rules boolean not null,
    can_manage_feature_flags boolean not null,
    can_manage_access_policies boolean not null,
    allowed_export_resources jsonb not null,
    resolution_version text not null,
    resolved_at timestamptz not null default now()
);

create table if not exists feature_flags (
    feature_flag_key text primary key,
    enabled boolean not null,
    description text not null,
    version integer not null default 0,
    updated_by_user_id text not null,
    updated_at timestamptz not null default now()
);

create table if not exists canonical_events (
    canonical_event_id text primary key,
    correlation_id text not null,
    strategy_id text,
    canonical_family canonical_family not null,
    lifecycle_stage lifecycle_stage not null,
    source_system source_system not null,
    source_variant text not null,
    source_repo text not null,
    source_event_name text not null,
    source_event_id text,
    source_envelope_id text,
    source_contract_version text,
    adapter_version text not null,
    source_path_mode source_path_mode not null,
    dedup_key text not null unique,
    occurred_at timestamptz not null,
    published_at timestamptz,
    first_seen_at timestamptz not null,
    last_seen_at timestamptz not null,
    ordering jsonb not null,
    degraded_reasons jsonb not null,
    reconciliation_status reconciliation_status not null,
    normalized_payload jsonb not null,
    raw_payload jsonb not null
);

create table if not exists event_observations (
    event_observation_id text primary key,
    canonical_event_id text references canonical_events(canonical_event_id) on delete set null,
    source_system source_system not null,
    source_variant text not null,
    source_repo text not null,
    source_event_name text not null,
    source_event_id text,
    source_envelope_id text,
    replay_kind replay_kind not null,
    is_redelivered boolean not null,
    is_backfill boolean not null,
    correlation_id_candidate text,
    dedup_key_candidate text not null,
    published_at timestamptz,
    received_at timestamptz not null,
    source_sequence text,
    source_delivery_ordinal integer,
    broker_exchange text,
    broker_queue text,
    broker_routing_key text,
    broker_delivery_tag text,
    adapter_version text not null,
    accepted_as_new_fact boolean not null,
    schema_validation_error text,
    raw_payload jsonb not null
);

create table if not exists identifier_aliases (
    identifier_alias_id text primary key,
    canonical_event_id text not null references canonical_events(canonical_event_id) on delete cascade,
    alias_kind text not null,
    alias_value text not null,
    source text not null,
    created_at timestamptz not null default now()
);

create table if not exists projection_changes (
    projection_change_id bigserial primary key,
    channel text not null,
    entity_type text not null,
    entity_id text not null,
    correlation_id text,
    effective_occurred_at timestamptz,
    detail_level detail_level not null,
    payload jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists decisions (
    decision_id text primary key,
    canonical_event_id text not null references canonical_events(canonical_event_id) on delete cascade,
    correlation_id text not null,
    strategy_id text not null,
    symbol text,
    market_ticker text not null,
    action text not null,
    reason_raw text not null,
    decision_at timestamptz not null,
    skip_category skip_category,
    skip_code text,
    source_path_mode source_path_mode not null,
    metadata jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists trades (
    trade_id text primary key,
    canonical_event_id text not null references canonical_events(canonical_event_id) on delete cascade,
    correlation_id text not null,
    strategy_id text,
    market_ticker text not null,
    side text,
    action_type text,
    quantity integer,
    status text not null,
    source_path_mode source_path_mode not null,
    retry_count integer,
    publisher_order_id text,
    client_order_id text,
    external_order_id text,
    kalshi_order_id text,
    command_event_id text,
    trade_intent_id text,
    target_publisher_order_id text,
    target_client_order_id text,
    target_external_order_id text,
    occurred_at timestamptz not null,
    terminal_state_at timestamptz,
    degraded_reasons jsonb not null,
    metadata jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists fills (
    fill_id text primary key,
    canonical_event_id text not null references canonical_events(canonical_event_id) on delete cascade,
    trade_id text references trades(trade_id) on delete set null,
    correlation_id text not null,
    strategy_id text,
    market_ticker text not null,
    side text,
    quantity integer not null,
    price numeric(12, 4) not null,
    occurred_at timestamptz not null,
    created_at timestamptz not null default now()
);

create table if not exists reconciliation_gaps (
    gap_id text primary key,
    correlation_id text not null,
    strategy_id text,
    gap_type text not null,
    expected_stage text,
    status reconciliation_status not null,
    details jsonb not null,
    detected_at timestamptz not null default now(),
    resolved_at timestamptz
);

create table if not exists alert_rules (
    alert_rule_id text primary key,
    rule_key text not null unique,
    alert_type alert_type not null,
    scope_type text not null,
    scope_key text not null,
    threshold jsonb not null,
    enabled boolean not null default true,
    version integer not null default 0,
    updated_by_user_id text not null,
    updated_at timestamptz not null default now()
);

create table if not exists alerts (
    alert_id text primary key,
    correlation_id text,
    strategy_id text,
    alert_type alert_type not null,
    severity alert_severity not null,
    status alert_status not null,
    source_canonical_event_id text,
    summary text not null,
    detail text not null,
    affected_component text not null,
    metadata jsonb not null,
    first_seen_at timestamptz not null,
    last_seen_at timestamptz not null,
    resolved_at timestamptz
);

create table if not exists audit_logs (
    audit_log_id text primary key,
    actor_user_id text not null,
    action text not null,
    target_type text not null,
    target_id text not null,
    result text not null,
    reason text,
    before_state jsonb,
    after_state jsonb,
    occurred_at timestamptz not null default now()
);

create table if not exists heartbeats (
    heartbeat_id text primary key,
    canonical_event_id text references canonical_events(canonical_event_id) on delete set null,
    strategy_id text,
    component_name text not null,
    status text not null,
    metadata jsonb not null,
    occurred_at timestamptz not null
);

create table if not exists queue_metrics (
    queue_metric_id text primary key,
    canonical_event_id text references canonical_events(canonical_event_id) on delete set null,
    component_name text not null,
    queue_name text not null,
    message_count integer not null,
    consumer_count integer not null,
    oldest_message_age_ms integer not null,
    dead_letter_size integer not null,
    dead_letter_growth integer not null,
    publish_failures integer not null,
    unroutable_events integer not null,
    reconnecting boolean not null,
    metadata jsonb not null,
    occurred_at timestamptz not null
);

create table if not exists ingest_checkpoints (
    checkpoint_key text primary key,
    source_binding_id text,
    projection_cursor text,
    last_observed_at timestamptz,
    metadata jsonb not null,
    updated_at timestamptz not null default now()
);

create table if not exists positions (
    position_snapshot_id text primary key,
    canonical_event_id text references canonical_events(canonical_event_id) on delete set null,
    strategy_id text not null,
    market_ticker text not null,
    side text not null,
    contracts integer not null,
    average_entry_price numeric(12, 4) not null,
    last_marked_price numeric(12, 4) not null,
    market_exposure numeric(12, 4),
    fees_paid numeric(12, 4),
    status position_status not null,
    valuation_source valuation_source not null,
    metadata jsonb not null,
    occurred_at timestamptz not null
);

create table if not exists pnl_snapshots (
    pnl_snapshot_id text primary key,
    canonical_event_id text references canonical_events(canonical_event_id) on delete set null,
    strategy_id text,
    symbol text,
    market_ticker text,
    bucket_type text not null,
    range_start timestamptz,
    range_end timestamptz,
    realized_pnl numeric(14, 4) not null,
    unrealized_pnl numeric(14, 4) not null,
    fees numeric(14, 4) not null,
    total_pnl numeric(14, 4) not null,
    stale boolean not null default false,
    partial boolean not null default false,
    valuation_source valuation_source not null,
    metadata jsonb not null,
    occurred_at timestamptz not null
);
