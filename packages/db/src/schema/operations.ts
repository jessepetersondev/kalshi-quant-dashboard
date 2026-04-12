import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { canonicalEvents } from "./canonical-events.js";

export const queueMetrics = pgTable("queue_metrics", {
  queueMetricId: text("queue_metric_id").primaryKey(),
  canonicalEventId: text("canonical_event_id").references(() => canonicalEvents.canonicalEventId, {
    onDelete: "set null"
  }),
  componentName: text("component_name").notNull(),
  queueName: text("queue_name").notNull(),
  messageCount: integer("message_count").notNull(),
  consumerCount: integer("consumer_count").notNull(),
  oldestMessageAgeMs: integer("oldest_message_age_ms").notNull(),
  deadLetterSize: integer("dead_letter_size").notNull(),
  deadLetterGrowth: integer("dead_letter_growth").notNull(),
  publishFailures: integer("publish_failures").notNull(),
  unroutableEvents: integer("unroutable_events").notNull(),
  reconnecting: boolean("reconnecting").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull()
});

export const ingestCheckpoints = pgTable("ingest_checkpoints", {
  checkpointKey: text("checkpoint_key").primaryKey(),
  sourceBindingId: text("source_binding_id"),
  projectionCursor: text("projection_cursor"),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
