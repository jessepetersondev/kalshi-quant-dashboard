# Queue Backlog and DLQ

## Trigger Conditions

- backlog age exceeds configured threshold
- DLQ growth continues across samples
- consumer freshness degrades or reconnect status flips

## Investigation

1. Open `/operations` and `/alerts`.
2. Compare queue depth, oldest message age, consumer count, and reconnect state.
3. Check whether the affected queue has a matching alert-rule override.
4. Inspect the alert detail page and raw payload metadata if permitted.

## Recovery

1. Restore or restart the affected consumer path.
2. Confirm backlog age trends down and DLQ growth stabilizes.
3. Acknowledge or resolve the alert only after the persisted metrics confirm recovery.
