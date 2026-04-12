import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { detailLevelEnum, roleEnum } from "./common.js";

export const effectiveCapabilitySnapshots = pgTable("effective_capability_snapshots", {
  effectiveCapabilitySnapshotId: text("effective_capability_snapshot_id").primaryKey(),
  userId: text("user_id").notNull(),
  resolvedRole: roleEnum("resolved_role").notNull(),
  strategyScope: jsonb("strategy_scope").$type<string[]>().notNull(),
  detailLevelMax: detailLevelEnum("detail_level_max").notNull(),
  canViewRawPayloads: boolean("can_view_raw_payloads").notNull(),
  canViewPrivilegedAuditLogs: boolean("can_view_privileged_audit_logs").notNull(),
  canManageAlertRules: boolean("can_manage_alert_rules").notNull(),
  canManageFeatureFlags: boolean("can_manage_feature_flags").notNull(),
  canManageAccessPolicies: boolean("can_manage_access_policies").notNull(),
  allowedExportResources: jsonb("allowed_export_resources")
    .$type<Record<string, unknown>[]>()
    .notNull(),
  resolutionVersion: text("resolution_version").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }).defaultNow().notNull()
});
