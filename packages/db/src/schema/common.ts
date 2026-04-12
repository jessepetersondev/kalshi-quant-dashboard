import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["operator", "developer", "admin"]);
export const sourceSystemEnum = pgEnum("source_system", [
  "strategy_adapter",
  "publisher",
  "executor",
  "rabbitmq_management",
  "dashboard"
]);
export const sourcePathModeEnum = pgEnum("source_path_mode", [
  "publisher_only",
  "direct_only",
  "hybrid"
]);
export const canonicalFamilyEnum = pgEnum("canonical_family", [
  "decision",
  "trade",
  "trade_intent",
  "skip",
  "publisher_event",
  "queue_metric",
  "executor_event",
  "fill",
  "position_snapshot",
  "pnl_snapshot",
  "heartbeat",
  "alert",
  "audit_event"
]);
export const lifecycleStageEnum = pgEnum("lifecycle_stage", [
  "strategy_emission",
  "skip",
  "intent",
  "publisher",
  "queue",
  "executor",
  "submission",
  "fill",
  "position",
  "pnl",
  "heartbeat",
  "alert",
  "terminal",
  "dead_letter"
]);
export const replayKindEnum = pgEnum("replay_kind", [
  "live",
  "redelivery",
  "replay",
  "backfill",
  "resync"
]);
export const reconciliationStatusEnum = pgEnum("reconciliation_status", [
  "pending",
  "consistent",
  "partial",
  "gap_detected",
  "corrected"
]);
export const subjectTypeEnum = pgEnum("subject_type", ["user", "role", "global"]);
export const policyRuleTypeEnum = pgEnum("policy_rule_type", [
  "strategy_scope",
  "raw_payload",
  "debug_stream",
  "privileged_audit",
  "admin_surface"
]);
export const policyEffectEnum = pgEnum("policy_effect", ["allow", "deny"]);
export const adminSurfaceEnum = pgEnum("admin_surface", [
  "alert_rules",
  "feature_flags",
  "access_policies",
  "audit_logs"
]);
export const exportResourceEnum = pgEnum("export_resource", [
  "decisions",
  "trades",
  "skips",
  "alerts",
  "pnl",
  "operations",
  "audit_logs"
]);
export const exportColumnProfileEnum = pgEnum("export_column_profile", [
  "summary",
  "detailed",
  "raw_payload"
]);
export const alertTypeEnum = pgEnum("alert_type", [
  "queue_backlog_age",
  "queue_depth",
  "dlq_growth",
  "missing_heartbeat",
  "stale_consumer",
  "ingest_failure",
  "stale_pnl",
  "missing_terminal_event",
  "reconnect_degraded"
]);
export const alertStatusEnum = pgEnum("alert_status", [
  "open",
  "acknowledged",
  "resolved",
  "suppressed"
]);
export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",
  "warning",
  "critical"
]);
export const skipCategoryEnum = pgEnum("skip_category", [
  "market_conditions",
  "risk_guardrail",
  "position_state",
  "timing_window",
  "configuration",
  "infrastructure",
  "data_quality",
  "operator_control",
  "other"
]);
export const detailLevelEnum = pgEnum("detail_level", ["standard", "debug"]);
export const positionStatusEnum = pgEnum("position_status", [
  "open",
  "partially_closed",
  "closed",
  "settled",
  "degraded"
]);
export const valuationSourceEnum = pgEnum("valuation_source", [
  "strategy_snapshot",
  "lifecycle_reconstruction",
  "hybrid"
]);
