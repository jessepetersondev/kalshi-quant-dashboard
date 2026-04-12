import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { alertTypeEnum } from "./common.js";

export const alertRules = pgTable("alert_rules", {
  alertRuleId: text("alert_rule_id").primaryKey(),
  ruleKey: text("rule_key").notNull().unique(),
  alertType: alertTypeEnum("alert_type").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeKey: text("scope_key").notNull(),
  threshold: jsonb("threshold").$type<Record<string, unknown>>().notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  version: integer("version").default(0).notNull(),
  updatedByUserId: text("updated_by_user_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
