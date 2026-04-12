import { z } from "zod";

import { isoDatetimeString } from "../shared.js";

export const skipDiagnosticReasonSchema = z.object({
  reason: z.string().min(1),
  count: z.number().int().nonnegative()
});

export const noTradeDiagnosticSchema = z.object({
  ran_at: isoDatetimeString,
  mode: z.string().min(1),
  spot: z.object({
    price: z.number(),
    source: z.string().min(1),
    timestamp: isoDatetimeString
  }),
  series: z.array(z.string()).default([]),
  raw_market_count: z.number().int().nonnegative(),
  supported_market_count: z.number().int().nonnegative(),
  target_market_count: z.number().int().nonnegative(),
  actionable_candidate_count: z.number().int().nonnegative(),
  blocked_candidate_count: z.number().int().nonnegative(),
  global_block_reason: z.string().nullable().optional(),
  top_reasons: z.array(skipDiagnosticReasonSchema)
});
