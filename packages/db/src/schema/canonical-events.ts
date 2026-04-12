import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import {
  canonicalFamilyEnum,
  lifecycleStageEnum,
  reconciliationStatusEnum,
  sourcePathModeEnum,
  sourceSystemEnum
} from "./common.js";

export const canonicalEvents = pgTable("canonical_events", {
  canonicalEventId: text("canonical_event_id").primaryKey(),
  correlationId: text("correlation_id").notNull(),
  strategyId: text("strategy_id"),
  canonicalFamily: canonicalFamilyEnum("canonical_family").notNull(),
  lifecycleStage: lifecycleStageEnum("lifecycle_stage").notNull(),
  sourceSystem: sourceSystemEnum("source_system").notNull(),
  sourceVariant: text("source_variant").notNull(),
  sourceRepo: text("source_repo").notNull(),
  sourceEventName: text("source_event_name").notNull(),
  sourceEventId: text("source_event_id"),
  sourceEnvelopeId: text("source_envelope_id"),
  sourceContractVersion: text("source_contract_version"),
  adapterVersion: text("adapter_version").notNull(),
  sourcePathMode: sourcePathModeEnum("source_path_mode").notNull(),
  dedupKey: text("dedup_key").notNull().unique(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  ordering: jsonb("ordering").$type<Record<string, unknown>>().notNull(),
  degradedReasons: jsonb("degraded_reasons").$type<string[]>().notNull(),
  reconciliationStatus: reconciliationStatusEnum("reconciliation_status").notNull(),
  normalizedPayload: jsonb("normalized_payload").$type<Record<string, unknown>>().notNull(),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull()
});
