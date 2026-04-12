import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { skipCategoryEnum, sourcePathModeEnum } from "./common.js";
import { canonicalEvents } from "./canonical-events.js";

export const decisions = pgTable("decisions", {
  decisionId: text("decision_id").primaryKey(),
  canonicalEventId: text("canonical_event_id")
    .notNull()
    .references(() => canonicalEvents.canonicalEventId, { onDelete: "cascade" }),
  correlationId: text("correlation_id").notNull(),
  strategyId: text("strategy_id").notNull(),
  symbol: text("symbol"),
  marketTicker: text("market_ticker").notNull(),
  action: text("action").notNull(),
  reasonRaw: text("reason_raw").notNull(),
  decisionAt: timestamp("decision_at", { withTimezone: true }).notNull(),
  skipCategory: skipCategoryEnum("skip_category"),
  skipCode: text("skip_code"),
  sourcePathMode: sourcePathModeEnum("source_path_mode").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
