import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { sourcePathModeEnum } from "./common.js";
import { canonicalEvents } from "./canonical-events.js";

export const trades = pgTable("trades", {
  tradeId: text("trade_id").primaryKey(),
  canonicalEventId: text("canonical_event_id")
    .notNull()
    .references(() => canonicalEvents.canonicalEventId, { onDelete: "cascade" }),
  correlationId: text("correlation_id").notNull(),
  strategyId: text("strategy_id"),
  marketTicker: text("market_ticker").notNull(),
  side: text("side"),
  actionType: text("action_type"),
  quantity: integer("quantity"),
  status: text("status").notNull(),
  sourcePathMode: sourcePathModeEnum("source_path_mode").notNull(),
  retryCount: integer("retry_count"),
  publisherOrderId: text("publisher_order_id"),
  clientOrderId: text("client_order_id"),
  externalOrderId: text("external_order_id"),
  kalshiOrderId: text("kalshi_order_id"),
  commandEventId: text("command_event_id"),
  tradeIntentId: text("trade_intent_id"),
  targetPublisherOrderId: text("target_publisher_order_id"),
  targetClientOrderId: text("target_client_order_id"),
  targetExternalOrderId: text("target_external_order_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  terminalStateAt: timestamp("terminal_state_at", { withTimezone: true }),
  degradedReasons: jsonb("degraded_reasons").$type<string[]>().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
