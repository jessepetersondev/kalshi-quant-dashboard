import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { canonicalEvents } from "./canonical-events.js";

export const heartbeats = pgTable("heartbeats", {
  heartbeatId: text("heartbeat_id").primaryKey(),
  canonicalEventId: text("canonical_event_id").references(() => canonicalEvents.canonicalEventId, {
    onDelete: "set null"
  }),
  strategyId: text("strategy_id"),
  componentName: text("component_name").notNull(),
  status: text("status").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull()
});
