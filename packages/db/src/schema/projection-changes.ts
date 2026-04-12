import { bigserial, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { detailLevelEnum } from "./common.js";

export const projectionChanges = pgTable("projection_changes", {
  projectionChangeId: bigserial("projection_change_id", { mode: "number" }).primaryKey(),
  channel: text("channel").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  correlationId: text("correlation_id"),
  effectiveOccurredAt: timestamp("effective_occurred_at", { withTimezone: true }),
  detailLevel: detailLevelEnum("detail_level").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
