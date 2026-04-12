import { z } from "zod";

import { isoDatetimeString } from "../shared.js";

export const rabbitMqManagementQueueSchema = z
  .object({
    name: z.string().min(1),
    messages: z.number().int().nonnegative(),
    messages_ready: z.number().int().nonnegative().optional(),
    messages_unacknowledged: z.number().int().nonnegative().optional(),
    consumers: z.number().int().nonnegative(),
    state: z.string().optional(),
    message_stats: z.record(z.unknown()).optional(),
    idle_since: isoDatetimeString.optional()
  })
  .passthrough();

export const rabbitMqQueueMetricSampleSchema = z.object({
  capturedAt: isoDatetimeString,
  queueName: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
  consumerCount: z.number().int().nonnegative(),
  oldestMessageAgeMs: z.number().int().nonnegative(),
  deadLetterSize: z.number().int().nonnegative().default(0),
  deadLetterGrowth: z.number().int(),
  publishFailures: z.number().int().nonnegative().default(0),
  unroutableEvents: z.number().int().nonnegative().default(0),
  reconnecting: z.boolean().default(false)
});
