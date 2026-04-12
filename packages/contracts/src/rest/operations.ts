import { z } from "zod";

import { isoDatetimeString } from "../shared.js";
import { queueRowSchema } from "./overview.js";
import { queryDetailLevelSchema } from "./common.js";

export const operationsQuerySchema = z.object({
  detailLevel: queryDetailLevelSchema
});

export const pipelineLatencyRowSchema = z.object({
  componentName: z.string().min(1),
  phase: z.string().min(1),
  latencyMs: z.number().nonnegative(),
  sampledAt: isoDatetimeString
});

export const operationsComponentStatusSchema = z.object({
  componentName: z.string().min(1),
  status: z.enum(["ok", "degraded", "missing"]),
  freshnessTimestamp: isoDatetimeString.nullable().optional(),
  detail: z.string().min(1)
});

export const operationsResponseSchema = z.object({
  generatedAt: isoDatetimeString,
  queueSummary: z.array(queueRowSchema),
  pipelineLatency: z.array(pipelineLatencyRowSchema),
  componentStatus: z.array(operationsComponentStatusSchema),
  openAlertCount: z.number().int().nonnegative(),
  degraded: z.boolean()
});

export type OperationsQuery = z.infer<typeof operationsQuerySchema>;
export type PipelineLatencyRow = z.infer<typeof pipelineLatencyRowSchema>;
export type OperationsComponentStatus = z.infer<typeof operationsComponentStatusSchema>;
export type OperationsResponse = z.infer<typeof operationsResponseSchema>;
