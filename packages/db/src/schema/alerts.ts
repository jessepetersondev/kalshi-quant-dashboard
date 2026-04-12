import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { alertSeverityEnum, alertStatusEnum, alertTypeEnum } from "./common.js";

export const alerts = pgTable("alerts", {
  alertId: text("alert_id").primaryKey(),
  correlationId: text("correlation_id"),
  strategyId: text("strategy_id"),
  alertType: alertTypeEnum("alert_type").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  status: alertStatusEnum("status").notNull(),
  sourceCanonicalEventId: text("source_canonical_event_id"),
  summary: text("summary").notNull(),
  detail: text("detail").notNull(),
  affectedComponent: text("affected_component").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});
