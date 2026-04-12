# Replay and Resync

Use this runbook when live events or history diverge after replay, backfill, or
redelivery.

## Signals

- lifecycle detail shows degraded or partial
- missing terminal event alerts remain open
- SSE reconnects but history does not match the last live row

## Actions

1. Check recent `event_observations` for the correlation id and confirm replay
   or redelivery metadata exists.
2. Run the terminal-gap or history-convergence job through the ingest runtime.
3. Re-open the decision or trade detail and confirm identifiers, timestamps, and
   terminal state match historical queries.
4. If divergence remains, inspect source compatibility mappings for alias gaps.
