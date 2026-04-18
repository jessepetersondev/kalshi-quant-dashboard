create index if not exists idx_identifier_aliases_canonical_event
  on identifier_aliases (canonical_event_id, alias_value);

create index if not exists idx_canonical_events_correlation_event
  on canonical_events (correlation_id, canonical_event_id);

create index if not exists idx_trades_correlation_latest
  on trades (correlation_id, terminal_state_at desc, occurred_at desc, updated_at desc);
