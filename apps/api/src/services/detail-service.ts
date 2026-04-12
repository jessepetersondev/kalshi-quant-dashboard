import { query } from "@kalshi-quant-dashboard/db";
import {
  eventTimelineItemSchema,
  rawPayloadEntrySchema,
  type EventTimelineItem,
  type RawPayloadEntry
} from "@kalshi-quant-dashboard/contracts";

import { projectDecisionAliases } from "../../../ingest/src/projections/decision-lifecycle-projector.js";

interface TimelineRow {
  readonly canonical_event_id: string;
  readonly canonical_family:
    | "decision"
    | "trade"
    | "trade_intent"
    | "skip"
    | "publisher_event"
    | "queue_metric"
    | "executor_event"
    | "fill"
    | "position_snapshot"
    | "pnl_snapshot"
    | "heartbeat"
    | "alert"
    | "audit_event";
  readonly lifecycle_stage:
    | "strategy_emission"
    | "skip"
    | "intent"
    | "publisher"
    | "queue"
    | "executor"
    | "submission"
    | "fill"
    | "position"
    | "pnl"
    | "heartbeat"
    | "alert"
    | "terminal"
    | "dead_letter";
  readonly occurred_at: string;
  readonly published_at: string | null;
  readonly first_seen_at: string;
  readonly source_event_name: string;
  readonly source_path_mode: "publisher_only" | "direct_only" | "hybrid";
  readonly ordering: Record<string, unknown>;
  readonly degraded_reasons: string[] | null;
  readonly source_system: string;
  readonly raw_payload: Record<string, unknown>;
}

function compareMaybeNumeric(left: string | number | undefined, right: string | number | undefined) {
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

function sortTimeline(rows: readonly TimelineRow[]): TimelineRow[] {
  return [...rows].sort((left, right) => {
    const occurred = left.occurred_at.localeCompare(right.occurred_at);
    if (occurred !== 0) {
      return occurred;
    }

    const sequence = compareMaybeNumeric(
      left.ordering.sourceSequence as string | number | undefined,
      right.ordering.sourceSequence as string | number | undefined
    );
    if (sequence !== 0) {
      return sequence;
    }

    const published = (left.published_at ?? "").localeCompare(right.published_at ?? "");
    if (published !== 0) {
      return published;
    }

    const firstSeen = left.first_seen_at.localeCompare(right.first_seen_at);
    if (firstSeen !== 0) {
      return firstSeen;
    }

    return left.canonical_event_id.localeCompare(right.canonical_event_id);
  });
}

export class DetailService {
  async getTimeline(correlationId: string): Promise<EventTimelineItem[]> {
    const result = await query<TimelineRow>(
      `
        select
          canonical_event_id,
          canonical_family,
          lifecycle_stage,
          occurred_at::text as occurred_at,
          published_at::text as published_at,
          first_seen_at::text as first_seen_at,
          source_event_name,
          source_path_mode,
          ordering,
          degraded_reasons,
          source_system,
          raw_payload
        from canonical_events
        where correlation_id = $1
        order by occurred_at asc, first_seen_at asc, canonical_event_id asc
      `,
      [correlationId]
    );

    return sortTimeline(result.rows).map((row) =>
      eventTimelineItemSchema.parse({
        canonicalEventId: row.canonical_event_id,
        canonicalFamily: row.canonical_family,
        lifecycleStage: row.lifecycle_stage,
        occurredAt: new Date(row.occurred_at).toISOString(),
        publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
        firstSeenAt: new Date(row.first_seen_at).toISOString(),
        sourceEventName: row.source_event_name,
        sourcePathMode: row.source_path_mode,
        ordering: row.ordering,
        degradedReasons: row.degraded_reasons ?? []
      })
    );
  }

  async getRawPayloadEntries(correlationId: string): Promise<RawPayloadEntry[]> {
    const result = await query<TimelineRow>(
      `
        select
          canonical_event_id,
          canonical_family,
          lifecycle_stage,
          occurred_at::text as occurred_at,
          published_at::text as published_at,
          first_seen_at::text as first_seen_at,
          source_event_name,
          source_path_mode,
          ordering,
          degraded_reasons,
          source_system,
          raw_payload
        from canonical_events
        where correlation_id = $1
        order by occurred_at asc, first_seen_at asc, canonical_event_id asc
      `,
      [correlationId]
    );

    return sortTimeline(result.rows).map((row) =>
      rawPayloadEntrySchema.parse({
        canonicalEventId: row.canonical_event_id,
        sourceSystem: row.source_system,
        sourceEventName: row.source_event_name,
        rawPayload: row.raw_payload
      })
    );
  }

  async getDebugMetadata(correlationId: string): Promise<Record<string, unknown>> {
    const [aliases, observationResult] = await Promise.all([
      projectDecisionAliases(correlationId),
      query<{ observation_count: number }>(
        `
          select count(*)::int as observation_count
          from event_observations eo
          inner join canonical_events ce
            on ce.canonical_event_id = eo.canonical_event_id
          where ce.correlation_id = $1
        `,
        [correlationId]
      )
    ]);

    return {
      aliasValues: aliases,
      observationCount: observationResult.rows[0]?.observation_count ?? 0
    };
  }
}
