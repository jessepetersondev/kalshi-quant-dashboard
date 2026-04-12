# Stale PnL

## Trigger Conditions

- PnL cards show `aged`, `partial`, or disagreement badges
- stale PnL alerts fire for one or more strategies

## Investigation

1. Open `/pnl` and identify the affected strategy, symbol, or market bucket.
2. Compare direct snapshot freshness with reconstructed lifecycle facts.
3. Confirm whether the disagreement is caused by stale marks, partial fills,
   settlement lag, or missing terminal events.

## Recovery

1. Trigger the PnL resync job or replay the missing lifecycle events.
2. Verify the disagreement indicator clears or remains explicitly degraded.
3. Do not treat stale or partial values as fresh portfolio totals.
