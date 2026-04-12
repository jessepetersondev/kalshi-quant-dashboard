import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { sourcePathModeEnum } from "./common.js";

export const strategies = pgTable("strategies", {
  strategyId: text("strategy_id").primaryKey(),
  displayName: text("display_name").notNull(),
  repoName: text("repo_name").notNull().unique(),
  symbol: text("symbol").notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  seededInitialStrategy: boolean("seeded_initial_strategy").default(false).notNull(),
  sourcePathMode: sourcePathModeEnum("source_path_mode").notNull(),
  defaultSourceBindingId: text("default_source_binding_id"),
  healthStatus: text("health_status").default("unknown").notNull(),
  latestHeartbeatAt: timestamp("latest_heartbeat_at", { withTimezone: true }),
  latestPnlSnapshotAt: timestamp("latest_pnl_snapshot_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const strategyEndpoints = pgTable("strategy_endpoints", {
  endpointId: text("endpoint_id").primaryKey(),
  strategyId: text("strategy_id").references(() => strategies.strategyId, {
    onDelete: "cascade"
  }),
  sourceBindingId: text("source_binding_id").notNull(),
  baseUrl: text("base_url").notNull(),
  healthPath: text("health_path").notNull(),
  statusPath: text("status_path").notNull(),
  positionsPath: text("positions_path").notNull(),
  tradesPath: text("trades_path").notNull(),
  ordersPath: text("orders_path").notNull(),
  pnlPath: text("pnl_path").notNull(),
  realizedPnlPath: text("realized_pnl_path").notNull(),
  skipDiagnosticsPath: text("skip_diagnostics_path"),
  dashboardLivePath: text("dashboard_live_path"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
