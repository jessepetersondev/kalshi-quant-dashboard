import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  auditLogId: text("audit_log_id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  result: text("result").notNull(),
  reason: text("reason"),
  beforeState: jsonb("before_state").$type<Record<string, unknown> | null>(),
  afterState: jsonb("after_state").$type<Record<string, unknown> | null>(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull()
});
