import { randomUUID } from "node:crypto";

import type { NormalizedDashboardEvent } from "@kalshi-quant-dashboard/contracts";
import { withClient } from "@kalshi-quant-dashboard/db";

function compareMaybeNumeric(
  left: string | number | undefined,
  right: string | number | undefined
): number {
  if (left === undefined || right === undefined) {
    return 0;
  }

  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right));
}

export class ConvergenceService {
  sortTimeline(events: readonly NormalizedDashboardEvent[]): NormalizedDashboardEvent[] {
    return [...events].sort((left, right) => {
      const occurred = left.occurredAt.localeCompare(right.occurredAt);
      if (occurred !== 0) {
        return occurred;
      }

      const sequence = compareMaybeNumeric(
        left.ordering.sourceSequence,
        right.ordering.sourceSequence
      );
      if (sequence !== 0) {
        return sequence;
      }

      const published = (left.publishedAt ?? "").localeCompare(right.publishedAt ?? "");
      if (published !== 0) {
        return published;
      }

      const firstSeen = left.firstSeenAt.localeCompare(right.firstSeenAt);
      if (firstSeen !== 0) {
        return firstSeen;
      }

      return left.canonicalEventId.localeCompare(right.canonicalEventId);
    });
  }

  async reconcileMissingTerminalEvents(maxAgeMinutes = 5): Promise<number> {
    return withClient(async (client) => {
      const staleTrades = await client.query<{
        trade_id: string;
        correlation_id: string;
        strategy_id: string | null;
      }>(
        `
          select trade_id, correlation_id, strategy_id
          from trades
          where terminal_state_at is null
            and occurred_at < now() - ($1::text || ' minutes')::interval
        `,
        [String(maxAgeMinutes)]
      );

      for (const row of staleTrades.rows) {
        await client.query(
          `
            insert into reconciliation_gaps (
              gap_id,
              correlation_id,
              strategy_id,
              gap_type,
              expected_stage,
              status,
              details
            )
            values ($1, $2, $3, 'missing_terminal_event', 'terminal', 'gap_detected', $4::jsonb)
            on conflict (gap_id) do nothing
          `,
          [
            `gap-${row.trade_id}`,
            row.correlation_id,
            row.strategy_id,
            JSON.stringify({ tradeId: row.trade_id })
          ]
        );
      }

      return staleTrades.rowCount ?? 0;
    });
  }

  async markStreamMismatch(correlationId: string, details: Record<string, unknown>): Promise<void> {
    await withClient(async (client) => {
      await client.query(
        `
          insert into reconciliation_gaps (
            gap_id,
            correlation_id,
            gap_type,
            expected_stage,
            status,
            details
          )
          values ($1, $2, 'stream_history_mismatch', 'terminal', 'gap_detected', $3::jsonb)
        `,
        [`gap-${randomUUID()}`, correlationId, JSON.stringify(details)]
      );
    });
  }
}
