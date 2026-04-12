import { randomUUID } from "node:crypto";

import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query, withClient } from "@kalshi-quant-dashboard/db";
import {
  alertDetailResponseSchema,
  alertListResponseSchema,
  alertRowSchema,
  eventTimelineItemSchema,
  pageInfoSchema,
  rawPayloadEntrySchema,
  type AlertDetailResponse,
  type AlertListQuery,
  type AlertListResponse
} from "@kalshi-quant-dashboard/contracts";

export interface AlertUpsertInput {
  readonly alertId: string;
  readonly correlationId?: string | null;
  readonly strategyId?: string | null;
  readonly alertType: string;
  readonly severity: "info" | "warning" | "critical";
  readonly status: "open" | "acknowledged" | "resolved" | "suppressed";
  readonly sourceCanonicalEventId?: string | null;
  readonly summary: string;
  readonly detail: string;
  readonly affectedComponent: string;
  readonly metadata: Record<string, unknown>;
  readonly seenAt: string;
}

interface AlertRowDb {
  readonly alert_id: string;
  readonly correlation_id: string | null;
  readonly strategy_id: string | null;
  readonly alert_type: string;
  readonly severity: string;
  readonly status: string;
  readonly source_canonical_event_id: string | null;
  readonly summary: string;
  readonly detail: string;
  readonly affected_component: string;
  readonly metadata: Record<string, unknown>;
  readonly first_seen_at: string;
  readonly last_seen_at: string;
  readonly resolved_at: string | null;
}

export function resolveAlertTransition(args: {
  readonly previousStatus?: string | null | undefined;
  readonly nextStatus: string;
  readonly seenAt: string;
}) {
  return {
    status: args.nextStatus,
    resolvedAt: args.nextStatus === "resolved" ? args.seenAt : null,
    reopened: args.previousStatus === "resolved" && args.nextStatus !== "resolved"
  };
}

function toListRow(row: AlertRowDb) {
  return alertRowSchema.parse({
    alertId: row.alert_id,
    alertType: row.alert_type,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    componentType: row.strategy_id ? "strategy" : "pipeline",
    componentKey: row.strategy_id ?? row.affected_component,
    latestSeenAt: new Date(row.last_seen_at).toISOString(),
    detailPath: `/alerts/${row.alert_id}`
  });
}

export async function upsertProjectedAlert(input: AlertUpsertInput): Promise<void> {
  await withClient(async (client) => {
    const existing = await client.query<{
      alert_id: string;
      status: string;
      metadata: Record<string, unknown>;
    }>(
      `
        select alert_id, status, metadata
        from alerts
        where alert_id = $1
        limit 1
      `,
      [input.alertId]
    );

    const isInsert = existing.rowCount === 0;
    const transition = resolveAlertTransition({
      previousStatus: existing.rows[0]?.status,
      nextStatus: input.status,
      seenAt: input.seenAt
    });

    await client.query(
      `
        insert into alerts (
          alert_id,
          correlation_id,
          strategy_id,
          alert_type,
          severity,
          status,
          source_canonical_event_id,
          summary,
          detail,
          affected_component,
          metadata,
          first_seen_at,
          last_seen_at,
          resolved_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14)
        on conflict (alert_id) do update
        set severity = excluded.severity,
            status = excluded.status,
            source_canonical_event_id = excluded.source_canonical_event_id,
            summary = excluded.summary,
            detail = excluded.detail,
            affected_component = excluded.affected_component,
            metadata = excluded.metadata,
            last_seen_at = excluded.last_seen_at,
            resolved_at = excluded.resolved_at
      `,
      [
        input.alertId,
        input.correlationId ?? null,
        input.strategyId ?? null,
        input.alertType,
        input.severity,
        transition.status,
        input.sourceCanonicalEventId ?? null,
        input.summary,
        input.detail,
        input.affectedComponent,
        JSON.stringify(input.metadata),
        input.seenAt,
        input.seenAt,
        transition.resolvedAt
      ]
    );

    await client.query(
      `
        insert into projection_changes (
          channel,
          entity_type,
          entity_id,
          correlation_id,
          effective_occurred_at,
          detail_level,
          payload
        )
        values ('alerts', 'alert', $1, $2, $3, 'standard', $4::jsonb)
      `,
      [
        input.alertId,
        input.correlationId ?? null,
        input.seenAt,
        JSON.stringify({
          alertId: input.alertId,
          strategyId: input.strategyId ?? null,
          alertType: input.alertType
        })
      ]
    );

    await client.query(
      `
        insert into audit_logs (
          audit_log_id,
          actor_user_id,
          action,
          target_type,
          target_id,
          result,
          reason,
          before_state,
          after_state
        )
        values ($1, 'system-ingest', $2, 'alert', $3, 'accepted', $4, $5::jsonb, $6::jsonb)
      `,
      [
        randomUUID(),
        isInsert ? "alert.create" : "alert.update",
        input.alertId,
        input.summary,
        JSON.stringify(existing.rows[0]?.metadata ?? null),
        JSON.stringify(input.metadata)
      ]
    );
  });
}

export async function projectAlertList(args: {
  readonly strategyScope: readonly string[];
  readonly query: AlertListQuery;
}): Promise<AlertListResponse> {
  const result = await query<AlertRowDb>(
    `
      select
        alert_id,
        correlation_id,
        strategy_id,
        alert_type,
        severity,
        status,
        source_canonical_event_id,
        summary,
        detail,
        affected_component,
        metadata,
        first_seen_at::text as first_seen_at,
        last_seen_at::text as last_seen_at,
        resolved_at::text as resolved_at
      from alerts
      order by last_seen_at desc, alert_id asc
    `
  );

  const filtered = result.rows.filter((row) => {
    if (row.strategy_id && !scopeAllows(args.strategyScope, row.strategy_id)) {
      return false;
    }

    if (args.query.strategy?.length) {
      if (!row.strategy_id || !args.query.strategy.includes(row.strategy_id)) {
        return false;
      }
    }

    if (args.query.severity?.length && !args.query.severity.includes(row.severity)) {
      return false;
    }

    if (args.query.status?.length && !args.query.status.includes(row.status)) {
      return false;
    }

    if (!args.query.search?.trim()) {
      return true;
    }

    return [row.alert_id, row.summary, row.detail, row.alert_type, row.affected_component]
      .join(" ")
      .toLowerCase()
      .includes(args.query.search.trim().toLowerCase());
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / args.query.pageSize));
  const start = (args.query.page - 1) * args.query.pageSize;

  return alertListResponseSchema.parse({
    items: filtered.slice(start, start + args.query.pageSize).map(toListRow),
    pageInfo: pageInfoSchema.parse({
      page: args.query.page,
      pageSize: args.query.pageSize,
      totalItems,
      totalPages
    })
  });
}

export async function projectAlertDetail(args: {
  readonly alertId: string;
  readonly strategyScope: readonly string[];
  readonly includeRawPayloads: boolean;
}): Promise<AlertDetailResponse | null> {
  const result = await query<AlertRowDb>(
    `
      select
        alert_id,
        correlation_id,
        strategy_id,
        alert_type,
        severity,
        status,
        source_canonical_event_id,
        summary,
        detail,
        affected_component,
        metadata,
        first_seen_at::text as first_seen_at,
        last_seen_at::text as last_seen_at,
        resolved_at::text as resolved_at
      from alerts
      where alert_id = $1
      limit 1
    `,
    [args.alertId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }
  if (row.strategy_id && !scopeAllows(args.strategyScope, row.strategy_id)) {
    return null;
  }

  const timelineQuery = row.correlation_id
    ? await query<{
        canonical_event_id: string;
        canonical_family: string;
        lifecycle_stage: string;
        occurred_at: string;
        published_at: string | null;
        first_seen_at: string;
        source_event_name: string;
        source_path_mode: "publisher_only" | "direct_only" | "hybrid";
        ordering: Record<string, unknown>;
        degraded_reasons: string[];
      }>(
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
            degraded_reasons
          from canonical_events
          where correlation_id = $1
          order by occurred_at asc, first_seen_at asc, canonical_event_id asc
        `,
        [row.correlation_id]
      )
    : { rows: [] };

  const rawPayloadRows =
    args.includeRawPayloads && row.correlation_id
      ? await query<{
          canonical_event_id: string;
          source_system: string;
          source_event_name: string;
          raw_payload: Record<string, unknown>;
        }>(
          `
            select canonical_event_id, source_system, source_event_name, raw_payload
            from canonical_events
            where correlation_id = $1
            order by occurred_at asc, canonical_event_id asc
          `,
          [row.correlation_id]
        )
      : { rows: [] };

  const auditRows = await query<{
    audit_log_id: string;
    action: string;
    result: string;
    occurred_at: string;
    actor_user_id: string;
  }>(
    `
      select audit_log_id, action, result, occurred_at::text as occurred_at, actor_user_id
      from audit_logs
      where target_type = 'alert'
        and target_id = $1
      order by occurred_at desc
    `,
    [args.alertId]
  );

  return alertDetailResponseSchema.parse({
    summary: {
      ...toListRow(row),
      correlationId: row.correlation_id,
      strategyId: row.strategy_id,
      firstSeenAt: new Date(row.first_seen_at).toISOString(),
      detail: row.detail,
      affectedComponent: row.affected_component,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
      metadata: row.metadata ?? {}
    },
    timeline: timelineQuery.rows.map((item) =>
      eventTimelineItemSchema.parse({
        canonicalEventId: item.canonical_event_id,
        canonicalFamily: item.canonical_family,
        lifecycleStage: item.lifecycle_stage,
        occurredAt: new Date(item.occurred_at).toISOString(),
        publishedAt: item.published_at ? new Date(item.published_at).toISOString() : null,
        firstSeenAt: new Date(item.first_seen_at).toISOString(),
        sourceEventName: item.source_event_name,
        sourcePathMode: item.source_path_mode,
        ordering: item.ordering ?? {},
        degradedReasons: item.degraded_reasons ?? []
      })
    ),
    rawPayloadAvailable: args.includeRawPayloads,
    rawPayloads: rawPayloadRows.rows.map((item) =>
      rawPayloadEntrySchema.parse({
        canonicalEventId: item.canonical_event_id,
        sourceSystem: item.source_system,
        sourceEventName: item.source_event_name,
        rawPayload: item.raw_payload
      })
    ),
    auditEntries: auditRows.rows.map((item) => ({
      auditLogId: item.audit_log_id,
      action: item.action,
      result: item.result,
      occurredAt: new Date(item.occurred_at).toISOString(),
      actorUserId: item.actor_user_id
    }))
  });
}

export async function projectAlertStreamChanges(args: {
  readonly afterProjectionChangeId: number;
  readonly strategyScope: readonly string[];
  readonly requestedStrategyIds?: readonly string[];
}) {
  const result = await query<{
    projection_change_id: number;
    entity_id: string;
    effective_occurred_at: string;
  }>(
    `
      select
        projection_change_id::int as projection_change_id,
        entity_id,
        effective_occurred_at::text as effective_occurred_at
      from projection_changes
      where channel = 'alerts'
        and projection_change_id > $1
      order by projection_change_id asc
    `,
    [args.afterProjectionChangeId]
  );

  const summaries = await Promise.all(
    result.rows.map(async (row) => {
      const detail = await projectAlertDetail({
        alertId: row.entity_id,
        strategyScope: args.strategyScope,
        includeRawPayloads: false
      });

      if (!detail) {
        return null;
      }

      if (
        args.requestedStrategyIds?.length &&
        (!detail.summary.strategyId ||
          !args.requestedStrategyIds.includes(detail.summary.strategyId))
      ) {
        return null;
      }

      return {
        projectionChangeId: row.projection_change_id,
        effectiveOccurredAt: new Date(row.effective_occurred_at).toISOString(),
        alertId: row.entity_id,
        row: toListRow({
          alert_id: detail.summary.alertId,
          correlation_id: detail.summary.correlationId ?? null,
          strategy_id: detail.summary.strategyId ?? null,
          alert_type: detail.summary.alertType,
          severity: detail.summary.severity,
          status: detail.summary.status,
          source_canonical_event_id: null,
          summary: detail.summary.summary,
          detail: detail.summary.detail,
          affected_component: detail.summary.affectedComponent,
          metadata: detail.summary.metadata,
          first_seen_at: detail.summary.firstSeenAt,
          last_seen_at: detail.summary.latestSeenAt,
          resolved_at: detail.summary.resolvedAt ?? null
        })
      };
    })
  );

  return summaries.filter((value): value is NonNullable<typeof value> => value !== null);
}
