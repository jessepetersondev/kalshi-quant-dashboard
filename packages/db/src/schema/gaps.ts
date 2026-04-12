import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { reconciliationStatusEnum } from "./common.js";

export const reconciliationGaps = pgTable("reconciliation_gaps", {
  gapId: text("gap_id").primaryKey(),
  correlationId: text("correlation_id").notNull(),
  strategyId: text("strategy_id"),
  gapType: text("gap_type").notNull(),
  expectedStage: text("expected_stage"),
  status: reconciliationStatusEnum("status").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});
