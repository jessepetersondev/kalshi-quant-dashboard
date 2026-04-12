create index if not exists idx_canonical_events_correlation_occurred
  on canonical_events (correlation_id, occurred_at desc, first_seen_at desc);

create index if not exists idx_canonical_events_family_occurred
  on canonical_events (canonical_family, occurred_at desc);

create index if not exists idx_decisions_strategy_decision_at
  on decisions (strategy_id, decision_at desc);

create index if not exists idx_decisions_correlation_id
  on decisions (correlation_id);

create index if not exists idx_trades_strategy_updated_at
  on trades (strategy_id, updated_at desc);

create index if not exists idx_trades_correlation_id
  on trades (correlation_id);

create index if not exists idx_alerts_strategy_last_seen
  on alerts (strategy_id, last_seen_at desc);

create index if not exists idx_alerts_status_last_seen
  on alerts (status, last_seen_at desc);

create index if not exists idx_queue_metrics_queue_occurred
  on queue_metrics (queue_name, occurred_at desc);

create index if not exists idx_projection_changes_channel_projection
  on projection_changes (channel, projection_change_id desc);
