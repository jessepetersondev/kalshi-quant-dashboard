import { query } from "@kalshi-quant-dashboard/db";
import { queueRowSchema } from "@kalshi-quant-dashboard/contracts";

export async function projectQueueMetricRows() {
  const result = await query<{
    queue_name: string;
    component_name: string;
    message_count: number;
    consumer_count: number;
    oldest_message_age_ms: number;
    dead_letter_size: number;
    dead_letter_growth: number;
    publish_failures: number;
    unroutable_events: number;
    reconnecting: boolean;
    occurred_at: string;
  }>(
    `
      select distinct on (queue_name)
        queue_name,
        component_name,
        message_count,
        consumer_count,
        oldest_message_age_ms,
        dead_letter_size,
        dead_letter_growth,
        publish_failures,
        unroutable_events,
        reconnecting,
        occurred_at::text as occurred_at
      from queue_metrics
      order by queue_name, occurred_at desc
    `
  );

  return result.rows.map((row) =>
    queueRowSchema.parse({
      componentName: row.component_name,
      queueName: row.queue_name,
      messageCount: row.message_count,
      messagesReady: row.message_count,
      messagesUnacknowledged: 0,
      consumerCount: row.consumer_count,
      oldestMessageAgeSeconds: row.oldest_message_age_ms / 1000,
      dlqMessageCount: row.dead_letter_size,
      dlqGrowthTotal: row.dead_letter_growth,
      reconnectStatus: row.reconnecting ? "reconnecting" : "connected",
      sampledAt: new Date(row.occurred_at).toISOString()
    })
  );
}

export async function projectQueueMetricStreamChanges(args: {
  readonly afterProjectionChangeId: number;
}) {
  const result = await query<{
    projection_change_id: number;
    correlation_id: string | null;
    effective_occurred_at: string;
    payload: Record<string, unknown>;
  }>(
    `
      select
        projection_change_id::int as projection_change_id,
        correlation_id,
        effective_occurred_at::text as effective_occurred_at,
        payload
      from projection_changes
      where channel = 'operations'
        and projection_change_id > $1
      order by projection_change_id asc
    `,
    [args.afterProjectionChangeId]
  );

  const latestRows = await projectQueueMetricRows();
  return result.rows
    .map((row) => {
      const queueName = String(row.payload.correlationId ?? row.correlation_id ?? "");
      const latest = latestRows.find((candidate) =>
        queueName.length > 0 ? candidate.queueName === queueName.replace(/^rabbitmq:/, "") : true
      );
      if (!latest) {
        return null;
      }

      return {
        projectionChangeId: row.projection_change_id,
        effectiveOccurredAt: new Date(row.effective_occurred_at).toISOString(),
        queueName: latest.queueName,
        row: latest
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
}
