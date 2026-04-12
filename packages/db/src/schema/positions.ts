import { integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { canonicalEvents } from "./canonical-events.js";
import { positionStatusEnum, valuationSourceEnum } from "./common.js";

export const positions = pgTable("positions", {
  positionSnapshotId: text("position_snapshot_id").primaryKey(),
  canonicalEventId: text("canonical_event_id").references(() => canonicalEvents.canonicalEventId, {
    onDelete: "set null"
  }),
  strategyId: text("strategy_id").notNull(),
  marketTicker: text("market_ticker").notNull(),
  side: text("side").notNull(),
  contracts: integer("contracts").notNull(),
  averageEntryPrice: numeric("average_entry_price", { precision: 12, scale: 4 }).notNull(),
  lastMarkedPrice: numeric("last_marked_price", { precision: 12, scale: 4 }).notNull(),
  marketExposure: numeric("market_exposure", { precision: 12, scale: 4 }),
  feesPaid: numeric("fees_paid", { precision: 12, scale: 4 }),
  status: positionStatusEnum("status").notNull(),
  valuationSource: valuationSourceEnum("valuation_source").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull()
});
