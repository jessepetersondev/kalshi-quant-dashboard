import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { replayKindEnum, sourceSystemEnum } from "./common.js";
import { canonicalEvents } from "./canonical-events.js";

export const eventObservations = pgTable("event_observations", {
  eventObservationId: text("event_observation_id").primaryKey(),
  canonicalEventId: text("canonical_event_id").references(() => canonicalEvents.canonicalEventId, {
    onDelete: "set null"
  }),
  sourceSystem: sourceSystemEnum("source_system").notNull(),
  sourceVariant: text("source_variant").notNull(),
  sourceRepo: text("source_repo").notNull(),
  sourceEventName: text("source_event_name").notNull(),
  sourceEventId: text("source_event_id"),
  sourceEnvelopeId: text("source_envelope_id"),
  replayKind: replayKindEnum("replay_kind").notNull(),
  isRedelivered: boolean("is_redelivered").notNull(),
  isBackfill: boolean("is_backfill").notNull(),
  correlationIdCandidate: text("correlation_id_candidate"),
  dedupKeyCandidate: text("dedup_key_candidate").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  sourceSequence: text("source_sequence"),
  sourceDeliveryOrdinal: integer("source_delivery_ordinal"),
  brokerExchange: text("broker_exchange"),
  brokerQueue: text("broker_queue"),
  brokerRoutingKey: text("broker_routing_key"),
  brokerDeliveryTag: text("broker_delivery_tag"),
  adapterVersion: text("adapter_version").notNull(),
  acceptedAsNewFact: boolean("accepted_as_new_fact").notNull(),
  schemaValidationError: text("schema_validation_error"),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull()
});
