import { boolean, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { canonicalEvents } from "./canonical-events.js";
import { valuationSourceEnum } from "./common.js";

export const pnlSnapshots = pgTable("pnl_snapshots", {
  pnlSnapshotId: text("pnl_snapshot_id").primaryKey(),
  canonicalEventId: text("canonical_event_id").references(() => canonicalEvents.canonicalEventId, {
    onDelete: "set null"
  }),
  strategyId: text("strategy_id"),
  symbol: text("symbol"),
  marketTicker: text("market_ticker"),
  bucketType: text("bucket_type").notNull(),
  rangeStart: timestamp("range_start", { withTimezone: true }),
  rangeEnd: timestamp("range_end", { withTimezone: true }),
  realizedPnl: numeric("realized_pnl", { precision: 14, scale: 4 }).notNull(),
  unrealizedPnl: numeric("unrealized_pnl", { precision: 14, scale: 4 }).notNull(),
  fees: numeric("fees", { precision: 14, scale: 4 }).notNull(),
  totalPnl: numeric("total_pnl", { precision: 14, scale: 4 }).notNull(),
  stale: boolean("stale").default(false).notNull(),
  partial: boolean("partial").default(false).notNull(),
  valuationSource: valuationSourceEnum("valuation_source").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull()
});
