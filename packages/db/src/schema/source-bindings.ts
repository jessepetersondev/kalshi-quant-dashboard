import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { sourceSystemEnum } from "./common.js";
import { strategies } from "./strategies.js";

export const sourceBindings = pgTable("source_bindings", {
  sourceBindingId: text("source_binding_id").primaryKey(),
  sourceSystem: sourceSystemEnum("source_system").notNull(),
  sourceVariant: text("source_variant").notNull(),
  adapterVersion: text("adapter_version").notNull(),
  contractVersion: text("contract_version").notNull(),
  transportType: text("transport_type").notNull(),
  capabilities: jsonb("capabilities").$type<string[]>().notNull(),
  identityRules: jsonb("identity_rules").$type<Record<string, unknown>>().notNull(),
  orderingRules: jsonb("ordering_rules").$type<Record<string, unknown>>().notNull(),
  normalizationRules: jsonb("normalization_rules").$type<Record<string, unknown>>().notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const strategySourceBindings = pgTable("strategy_source_bindings", {
  strategySourceBindingId: text("strategy_source_binding_id").primaryKey(),
  strategyId: text("strategy_id")
    .notNull()
    .references(() => strategies.strategyId, { onDelete: "cascade" }),
  sourceBindingId: text("source_binding_id")
    .notNull()
    .references(() => sourceBindings.sourceBindingId, { onDelete: "cascade" }),
  priority: integer("priority").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  usedForDecisions: boolean("used_for_decisions").default(false).notNull(),
  usedForTrades: boolean("used_for_trades").default(false).notNull(),
  usedForSkips: boolean("used_for_skips").default(false).notNull(),
  usedForPositions: boolean("used_for_positions").default(false).notNull(),
  usedForPnl: boolean("used_for_pnl").default(false).notNull(),
  usedForHeartbeats: boolean("used_for_heartbeats").default(false).notNull(),
  usedForOperations: boolean("used_for_operations").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
