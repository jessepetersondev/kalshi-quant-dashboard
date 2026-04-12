import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import {
  adminSurfaceEnum,
  exportColumnProfileEnum,
  exportResourceEnum,
  policyEffectEnum,
  policyRuleTypeEnum,
  subjectTypeEnum
} from "./common.js";

export const accessPolicies = pgTable("access_policies", {
  accessPolicyId: text("access_policy_id").primaryKey(),
  subjectType: subjectTypeEnum("subject_type").notNull(),
  subjectKey: text("subject_key").notNull(),
  name: text("name").notNull(),
  precedence: integer("precedence").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  version: integer("version").default(0).notNull(),
  updatedByUserId: text("updated_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const accessPolicyRules = pgTable("access_policy_rules", {
  accessPolicyRuleId: text("access_policy_rule_id").primaryKey(),
  accessPolicyId: text("access_policy_id")
    .notNull()
    .references(() => accessPolicies.accessPolicyId, { onDelete: "cascade" }),
  ruleType: policyRuleTypeEnum("rule_type").notNull(),
  effect: policyEffectEnum("effect").notNull(),
  strategyScope: jsonb("strategy_scope").$type<string[] | null>(),
  adminSurface: adminSurfaceEnum("admin_surface"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const exportScopeGrants = pgTable("export_scope_grants", {
  exportScopeGrantId: text("export_scope_grant_id").primaryKey(),
  accessPolicyId: text("access_policy_id")
    .notNull()
    .references(() => accessPolicies.accessPolicyId, { onDelete: "cascade" }),
  resource: exportResourceEnum("resource").notNull(),
  strategyScope: jsonb("strategy_scope").$type<string[]>().notNull(),
  columnProfile: exportColumnProfileEnum("column_profile").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
