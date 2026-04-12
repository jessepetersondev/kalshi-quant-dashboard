import { z } from "zod";

import { systemHealthSummarySchema } from "./overview.js";
import { isoDatetimeString } from "../shared.js";

export const systemHealthComponentSchema = z.object({
  componentName: z.string().min(1),
  status: z.enum(["ok", "degraded", "missing"]),
  freshnessTimestamp: isoDatetimeString.nullable().optional(),
  detail: z.string().min(1)
});

export const systemHealthResponseSchema = z.object({
  generatedAt: isoDatetimeString,
  overview: systemHealthSummarySchema,
  components: z.array(systemHealthComponentSchema),
  degradedReasons: z.array(z.string()).default([])
});

export type SystemHealthComponent = z.infer<typeof systemHealthComponentSchema>;
export type SystemHealthResponse = z.infer<typeof systemHealthResponseSchema>;
