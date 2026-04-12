import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const featureFlags = pgTable("feature_flags", {
  featureFlagKey: text("feature_flag_key").primaryKey(),
  enabled: boolean("enabled").notNull(),
  description: text("description").notNull(),
  version: integer("version").default(0).notNull(),
  updatedByUserId: text("updated_by_user_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
