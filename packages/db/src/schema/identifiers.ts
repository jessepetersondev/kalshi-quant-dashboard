import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { canonicalEvents } from "./canonical-events.js";

export const identifierAliases = pgTable("identifier_aliases", {
  identifierAliasId: text("identifier_alias_id").primaryKey(),
  canonicalEventId: text("canonical_event_id")
    .notNull()
    .references(() => canonicalEvents.canonicalEventId, { onDelete: "cascade" }),
  aliasKind: text("alias_kind").notNull(),
  aliasValue: text("alias_value").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
