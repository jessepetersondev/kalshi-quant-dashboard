import { numeric, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

import { canonicalEvents } from "./canonical-events.js";
import { trades } from "./trades.js";

export const fills = pgTable("fills", {
  fillId: text("fill_id").primaryKey(),
  canonicalEventId: text("canonical_event_id")
    .notNull()
    .references(() => canonicalEvents.canonicalEventId, { onDelete: "cascade" }),
  tradeId: text("trade_id").references(() => trades.tradeId, { onDelete: "set null" }),
  correlationId: text("correlation_id").notNull(),
  strategyId: text("strategy_id"),
  marketTicker: text("market_ticker").notNull(),
  side: text("side"),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 12, scale: 4 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
