import { randomUUID } from "node:crypto";

import { withClient } from "@kalshi-quant-dashboard/db";

import type { NormalizedEntry } from "../normalization/normalize-observation.js";

function mergeOrdering(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...existing,
    ...incoming,
    hasRedelivery: Boolean(existing.hasRedelivery) || Boolean(incoming.hasRedelivery),
    hasReplay: Boolean(existing.hasReplay) || Boolean(incoming.hasReplay),
    hasBackfill: Boolean(existing.hasBackfill) || Boolean(incoming.hasBackfill)
  };
}

function projectionChannelsForFamily(family: string): string[] {
  if (family === "decision" || family === "skip") {
    return family === "skip" ? ["decisions", "skips"] : ["decisions"];
  }

  if (family === "trade" || family === "trade_intent" || family === "fill") {
    return ["trades"];
  }

  if (family === "queue_metric") {
    return ["operations"];
  }

  if (family === "alert") {
    return ["alerts"];
  }

  if (family === "pnl_snapshot") {
    return ["pnl"];
  }

  return ["overview"];
}

function tradeIdentity(payload: Record<string, unknown>, correlationId: string): string {
  return String(
    payload.publisherOrderId ??
      payload.clientOrderId ??
      payload.externalOrderId ??
      payload.tradeIntentId ??
      correlationId
  );
}

function decisionIdentity(payload: Record<string, unknown>, correlationId: string): string {
  return String(
    payload.decisionId ?? `${correlationId}:${payload.marketTicker ?? payload.ticker ?? "decision"}`
  );
}

export class DedupService {
  async persist(entries: readonly NormalizedEntry[]): Promise<{
    insertedFacts: number;
    duplicateObservations: number;
  }> {
    let insertedFacts = 0;
    let duplicateObservations = 0;

    await withClient(async (client) => {
      await client.query("begin");

      try {
        for (const entry of entries) {
          const existing = await client.query<{
            canonical_event_id: string;
            ordering: Record<string, unknown>;
          }>(
            `
              select canonical_event_id, ordering
              from canonical_events
              where dedup_key = $1
            `,
            [entry.event.dedupKey]
          );

          const canonicalEventId =
            existing.rows[0]?.canonical_event_id ?? entry.event.canonicalEventId;
          const acceptedAsNewFact = existing.rowCount === 0;

          if (acceptedAsNewFact) {
            insertedFacts += 1;
            await client.query(
              `
                insert into canonical_events (
                  canonical_event_id,
                  correlation_id,
                  strategy_id,
                  canonical_family,
                  lifecycle_stage,
                  source_system,
                  source_variant,
                  source_repo,
                  source_event_name,
                  source_event_id,
                  source_envelope_id,
                  source_contract_version,
                  adapter_version,
                  source_path_mode,
                  dedup_key,
                  occurred_at,
                  published_at,
                  first_seen_at,
                  last_seen_at,
                  ordering,
                  degraded_reasons,
                  reconciliation_status,
                  normalized_payload,
                  raw_payload
                )
                values (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                  $15, $16, $17, $18, $19, $20::jsonb, $21::jsonb, $22, $23::jsonb, $24::jsonb
                )
              `,
              [
                canonicalEventId,
                entry.event.correlationId,
                entry.event.strategyId ?? null,
                entry.event.canonicalFamily,
                entry.event.lifecycleStage,
                entry.event.sourceSystem,
                entry.event.sourceVariant,
                entry.event.sourceRepo,
                entry.event.sourceEventName,
                entry.event.sourceEventId ?? null,
                entry.event.sourceEnvelopeId ?? null,
                entry.event.sourceContractVersion ?? null,
                entry.event.adapterVersion,
                entry.event.sourcePathMode,
                entry.event.dedupKey,
                entry.event.occurredAt,
                entry.event.publishedAt ?? null,
                entry.event.firstSeenAt,
                entry.event.lastSeenAt,
                JSON.stringify(entry.event.ordering),
                JSON.stringify(entry.event.degradedReasons),
                entry.event.reconciliationStatus,
                JSON.stringify(entry.event.normalizedPayload),
                JSON.stringify(entry.event.rawPayload)
              ]
            );
          } else {
            duplicateObservations += 1;
            await client.query(
              `
                update canonical_events
                set last_seen_at = $2,
                    ordering = $3::jsonb
                where canonical_event_id = $1
              `,
              [
                canonicalEventId,
                entry.event.lastSeenAt,
                JSON.stringify(
                  mergeOrdering(existing.rows[0]!.ordering, entry.event.ordering)
                )
              ]
            );
          }

          await client.query(
            `
              insert into event_observations (
                event_observation_id,
                canonical_event_id,
                source_system,
                source_variant,
                source_repo,
                source_event_name,
                source_event_id,
                source_envelope_id,
                replay_kind,
                is_redelivered,
                is_backfill,
                correlation_id_candidate,
                dedup_key_candidate,
                published_at,
                received_at,
                source_sequence,
                source_delivery_ordinal,
                broker_exchange,
                broker_queue,
                broker_routing_key,
                broker_delivery_tag,
                adapter_version,
                accepted_as_new_fact,
                schema_validation_error,
                raw_payload
              )
              values (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25::jsonb
              )
            `,
            [
              entry.observation.eventObservationId,
              canonicalEventId,
              entry.observation.sourceSystem,
              entry.observation.sourceVariant,
              entry.observation.sourceRepo,
              entry.observation.sourceEventName,
              entry.observation.sourceEventId ?? null,
              entry.observation.sourceEnvelopeId ?? null,
              entry.observation.replayKind,
              entry.observation.isRedelivered,
              entry.observation.isBackfill,
              entry.observation.correlationIdCandidate ?? null,
              entry.observation.dedupKeyCandidate,
              entry.observation.publishedAt ?? null,
              entry.observation.receivedAt,
              entry.observation.sourceSequence
                ? String(entry.observation.sourceSequence)
                : null,
              entry.observation.sourceDeliveryOrdinal ?? null,
              entry.observation.brokerExchange ?? null,
              entry.observation.brokerQueue ?? null,
              entry.observation.brokerRoutingKey ?? null,
              entry.observation.brokerDeliveryTag
                ? String(entry.observation.brokerDeliveryTag)
                : null,
              entry.observation.adapterVersion,
              acceptedAsNewFact,
              entry.observation.schemaValidationError ?? null,
              JSON.stringify(entry.observation.rawPayload)
            ]
          );

          for (const alias of entry.event.aliases) {
            await client.query(
              `
                insert into identifier_aliases (
                  identifier_alias_id,
                  canonical_event_id,
                  alias_kind,
                  alias_value,
                  source
                )
                values ($1, $2, $3, $4, $5)
                on conflict do nothing
              `,
              [randomUUID(), canonicalEventId, alias.kind, alias.value, alias.source]
            );
          }

          const payload = entry.event.normalizedPayload;
          if (entry.event.canonicalFamily === "decision" || entry.event.canonicalFamily === "skip") {
            const decisionId = decisionIdentity(payload, entry.event.correlationId);
            await client.query(
              `
                insert into decisions (
                  decision_id,
                  canonical_event_id,
                  correlation_id,
                  strategy_id,
                  symbol,
                  market_ticker,
                  action,
                  reason_raw,
                  decision_at,
                  skip_category,
                  skip_code,
                  source_path_mode,
                  metadata
                )
                values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                on conflict (decision_id) do update
                set canonical_event_id = excluded.canonical_event_id,
                    reason_raw = excluded.reason_raw,
                    metadata = excluded.metadata
              `,
              [
                decisionId,
                canonicalEventId,
                entry.event.correlationId,
                entry.event.strategyId ?? "unknown",
                String(payload.symbol ?? ""),
                String(payload.marketTicker ?? payload.ticker ?? "unknown"),
                String(payload.action ?? entry.event.canonicalFamily),
                String(payload.reasonRaw ?? payload.reason ?? ""),
                String(payload.decisionAt ?? entry.event.occurredAt),
                payload.skipCategory ? String(payload.skipCategory) : null,
                payload.skipCode ? String(payload.skipCode) : null,
                entry.event.sourcePathMode,
                JSON.stringify(payload)
              ]
            );
          }

          if (
            ["trade", "trade_intent", "executor_event"].includes(entry.event.canonicalFamily)
          ) {
            const resolvedTradeId = tradeIdentity(payload, entry.event.correlationId);
            await client.query(
              `
                insert into trades (
                  trade_id,
                  canonical_event_id,
                  correlation_id,
                  strategy_id,
                  market_ticker,
                  side,
                  action_type,
                  quantity,
                  status,
                  source_path_mode,
                  retry_count,
                  publisher_order_id,
                  client_order_id,
                  external_order_id,
                  kalshi_order_id,
                  command_event_id,
                  trade_intent_id,
                  target_publisher_order_id,
                  target_client_order_id,
                  target_external_order_id,
                  occurred_at,
                  terminal_state_at,
                  degraded_reasons,
                  metadata
                )
                values (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                  $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, $24::jsonb
                )
                on conflict (trade_id) do update
                set canonical_event_id = excluded.canonical_event_id,
                    status = excluded.status,
                    terminal_state_at = coalesce(excluded.terminal_state_at, trades.terminal_state_at),
                    degraded_reasons = excluded.degraded_reasons,
                    metadata = excluded.metadata,
                    updated_at = now()
              `,
              [
                resolvedTradeId,
                canonicalEventId,
                entry.event.correlationId,
                entry.event.strategyId ?? null,
                String(payload.marketTicker ?? payload.ticker ?? "unknown"),
                payload.side ? String(payload.side) : null,
                payload.actionType ? String(payload.actionType) : null,
                payload.quantity ? Number(payload.quantity) : null,
                String(payload.status ?? payload.name ?? entry.event.sourceEventName),
                entry.event.sourcePathMode,
                payload.retryCount ? Number(payload.retryCount) : null,
                payload.publisherOrderId ? String(payload.publisherOrderId) : null,
                payload.clientOrderId ? String(payload.clientOrderId) : null,
                payload.externalOrderId ? String(payload.externalOrderId) : null,
                payload.kalshiOrderId ? String(payload.kalshiOrderId) : null,
                payload.commandEventId ? String(payload.commandEventId) : null,
                payload.tradeIntentId ? String(payload.tradeIntentId) : null,
                payload.targetPublisherOrderId
                  ? String(payload.targetPublisherOrderId)
                  : null,
                payload.targetClientOrderId ? String(payload.targetClientOrderId) : null,
                payload.targetExternalOrderId
                  ? String(payload.targetExternalOrderId)
                  : null,
                entry.event.occurredAt,
                entry.event.lifecycleStage === "terminal" ? entry.event.occurredAt : null,
                JSON.stringify(entry.event.degradedReasons),
                JSON.stringify(payload)
              ]
            );
          }

          if (entry.event.canonicalFamily === "fill") {
            await client.query(
              `
                insert into fills (
                  fill_id,
                  canonical_event_id,
                  trade_id,
                  correlation_id,
                  strategy_id,
                  market_ticker,
                  side,
                  quantity,
                  price,
                  occurred_at
                )
                values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                on conflict (fill_id) do nothing
              `,
              [
                String(payload.id ?? canonicalEventId),
                canonicalEventId,
                tradeIdentity(payload, entry.event.correlationId),
                entry.event.correlationId,
                entry.event.strategyId ?? null,
                String(payload.marketTicker ?? payload.ticker ?? "unknown"),
                payload.side ? String(payload.side) : null,
                Number(payload.quantity ?? payload.contracts ?? 0),
                Number(payload.price ?? 0),
                entry.event.occurredAt
              ]
            );
          }

          if (entry.event.canonicalFamily === "queue_metric") {
            await client.query(
              `
                insert into queue_metrics (
                  queue_metric_id,
                  canonical_event_id,
                  component_name,
                  queue_name,
                  message_count,
                  consumer_count,
                  oldest_message_age_ms,
                  dead_letter_size,
                  dead_letter_growth,
                  publish_failures,
                  unroutable_events,
                  reconnecting,
                  metadata,
                  occurred_at
                )
                values (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14
                )
                on conflict (queue_metric_id) do update
                set message_count = excluded.message_count,
                    consumer_count = excluded.consumer_count,
                    oldest_message_age_ms = excluded.oldest_message_age_ms,
                    dead_letter_size = excluded.dead_letter_size,
                    dead_letter_growth = excluded.dead_letter_growth,
                    publish_failures = excluded.publish_failures,
                    unroutable_events = excluded.unroutable_events,
                    reconnecting = excluded.reconnecting,
                    metadata = excluded.metadata,
                    occurred_at = excluded.occurred_at
              `,
              [
                `${payload.queueName}:${entry.event.occurredAt}`,
                canonicalEventId,
                "rabbitmq",
                String(payload.queueName),
                Number(payload.messageCount ?? 0),
                Number(payload.consumerCount ?? 0),
                Number(payload.oldestMessageAgeMs ?? 0),
                Number(payload.deadLetterSize ?? 0),
                Number(payload.deadLetterGrowth ?? 0),
                Number(payload.publishFailures ?? 0),
                Number(payload.unroutableEvents ?? 0),
                Boolean(payload.reconnecting),
                JSON.stringify(payload),
                entry.event.occurredAt
              ]
            );
          }

          if (entry.event.canonicalFamily === "heartbeat") {
            await client.query(
              `
                insert into heartbeats (
                  heartbeat_id,
                  canonical_event_id,
                  strategy_id,
                  component_name,
                  status,
                  metadata,
                  occurred_at
                )
                values ($1, $2, $3, $4, $5, $6::jsonb, $7)
                on conflict (heartbeat_id) do update
                set metadata = excluded.metadata,
                    occurred_at = excluded.occurred_at
              `,
              [
                `${entry.event.sourceRepo}:${entry.event.occurredAt}`,
                canonicalEventId,
                entry.event.strategyId ?? null,
                entry.event.sourceRepo,
                String(payload.halted ? "halted" : "ok"),
                JSON.stringify(payload),
                entry.event.occurredAt
              ]
            );
          }

          if (entry.event.canonicalFamily === "pnl_snapshot") {
            await client.query(
              `
                insert into pnl_snapshots (
                  pnl_snapshot_id,
                  canonical_event_id,
                  strategy_id,
                  symbol,
                  market_ticker,
                  bucket_type,
                  range_start,
                  range_end,
                  realized_pnl,
                  unrealized_pnl,
                  fees,
                  total_pnl,
                  stale,
                  partial,
                  valuation_source,
                  metadata,
                  occurred_at
                )
                values (
                  $1, $2, $3, $4, $5, 'current', null, null, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14
                )
                on conflict (pnl_snapshot_id) do update
                set realized_pnl = excluded.realized_pnl,
                    unrealized_pnl = excluded.unrealized_pnl,
                    total_pnl = excluded.total_pnl,
                    metadata = excluded.metadata,
                    occurred_at = excluded.occurred_at
              `,
              [
                `${entry.event.strategyId ?? entry.event.sourceRepo}:${entry.event.occurredAt}`,
                canonicalEventId,
                entry.event.strategyId ?? null,
                entry.event.strategyId?.toUpperCase() ?? null,
                payload.marketTicker ? String(payload.marketTicker) : null,
                Number(payload.realized_today ?? payload.total_realized_pnl ?? 0),
                Number(payload.unrealized ?? 0),
                Number(payload.fees ?? 0),
                Number(payload.total ?? payload.total_realized_pnl ?? 0),
                Boolean(payload.stale),
                Boolean(payload.partial),
                String(payload.valuationSource ?? "strategy_snapshot"),
                JSON.stringify(payload),
                entry.event.occurredAt
              ]
            );
          }

          if (entry.event.canonicalFamily === "position_snapshot") {
            await client.query(
              `
                insert into positions (
                  position_snapshot_id,
                  canonical_event_id,
                  strategy_id,
                  market_ticker,
                  side,
                  contracts,
                  average_entry_price,
                  last_marked_price,
                  market_exposure,
                  fees_paid,
                  status,
                  valuation_source,
                  metadata,
                  occurred_at
                )
                values (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14
                )
                on conflict (position_snapshot_id) do update
                set contracts = excluded.contracts,
                    average_entry_price = excluded.average_entry_price,
                    last_marked_price = excluded.last_marked_price,
                    market_exposure = excluded.market_exposure,
                    fees_paid = excluded.fees_paid,
                    status = excluded.status,
                    valuation_source = excluded.valuation_source,
                    metadata = excluded.metadata,
                    occurred_at = excluded.occurred_at
              `,
              [
                `${entry.event.strategyId ?? entry.event.sourceRepo}:${String(payload.ticker)}:${entry.event.occurredAt}`,
                canonicalEventId,
                entry.event.strategyId ?? "unknown",
                String(payload.ticker ?? "unknown"),
                String(payload.side ?? "unknown"),
                Number(payload.contracts ?? 0),
                Number(payload.average_entry_price ?? 0),
                Number(payload.last_marked_price ?? 0),
                Number(payload.market_exposure ?? 0),
                Number(payload.fees_paid ?? 0),
                Number(payload.contracts ?? 0) > 0 ? "open" : "closed",
                "strategy_snapshot",
                JSON.stringify(payload),
                entry.event.occurredAt
              ]
            );
          }

          for (const channel of projectionChannelsForFamily(entry.event.canonicalFamily)) {
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
                values ($1, $2, $3, $4, $5, 'standard', $6::jsonb)
              `,
              [
                channel,
                entry.event.canonicalFamily,
                canonicalEventId,
                entry.event.correlationId,
                entry.event.occurredAt,
                JSON.stringify({
                  canonicalEventId,
                  correlationId: entry.event.correlationId,
                  family: entry.event.canonicalFamily
                })
              ]
            );
          }
        }

        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    return { insertedFacts, duplicateObservations };
  }
}
