import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { roleEnum } from "./common.js";

export const users = pgTable("users", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  defaultRole: roleEnum("default_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const roleBindings = pgTable("role_bindings", {
  roleBindingId: text("role_binding_id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  strategyScope: jsonb("strategy_scope").$type<string[]>().notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
