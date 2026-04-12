import { z } from "zod";

export const roleSchema = z.enum(["operator", "developer", "admin"]);
export const detailLevelSchema = z.enum(["standard", "debug"]);
export const subjectTypeSchema = z.enum(["user", "role", "global"]);
export const policyRuleTypeSchema = z.enum([
  "strategy_scope",
  "raw_payload",
  "debug_stream",
  "privileged_audit",
  "admin_surface"
]);
export const policyEffectSchema = z.enum(["allow", "deny"]);
export const exportResourceSchema = z.enum([
  "decisions",
  "trades",
  "skips",
  "alerts",
  "pnl",
  "operations",
  "audit_logs"
]);
export const csvExportResourceValues = [
  "decisions",
  "trades",
  "skips",
  "alerts",
  "pnl"
] as const;
export const csvExportResourceSchema = z.enum(csvExportResourceValues);
export const exportColumnProfileSchema = z.enum([
  "summary",
  "detailed",
  "raw_payload"
]);
export const adminSurfaceSchema = z.enum([
  "alert_rules",
  "feature_flags",
  "access_policies",
  "audit_logs"
]);
export const alertTypeSchema = z.enum([
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
export const alertSeveritySchema = z.enum(["info", "warning", "critical"]);
export const isoDatetimeString = z.string().datetime({ offset: true });
export const jsonRecordSchema: z.ZodType<Record<string, unknown>> = z.record(z.unknown());
