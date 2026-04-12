import { z } from "zod";

import { detailLevelSchema } from "../shared.js";

export const liveSubscriptionRequestSchema = z.object({
  channels: z.array(
    z.enum(["overview", "decisions", "trades", "skips", "pnl", "operations", "alerts"])
  ),
  strategy: z.array(z.string()).optional(),
  compare: z.array(z.string()).optional(),
  timezone: z.enum(["utc", "local"]).default("utc"),
  detailLevel: detailLevelSchema.default("standard")
});

export const liveSubscriptionAuthorizationSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  filteredChannels: z.array(z.string()),
  detailLevel: detailLevelSchema
});

export type LiveSubscriptionRequest = z.infer<typeof liveSubscriptionRequestSchema>;
export type LiveSubscriptionAuthorization = z.infer<typeof liveSubscriptionAuthorizationSchema>;
