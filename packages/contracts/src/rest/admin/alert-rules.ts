import { z } from "zod";

import {
  alertSeveritySchema,
  alertTypeSchema,
  isoDatetimeString
} from "../../shared.js";
import { mutationAuditSchema } from "../common.js";

export const alertRuleConfigSchema = z.object({
  alertRuleId: z.string().min(1),
  ruleKey: z.string().min(1),
  alertType: alertTypeSchema,
  scopeType: z.string().min(1),
  scopeKey: z.string().min(1),
  severity: alertSeveritySchema,
  comparisonOperator: z.enum(["gte", "gt", "lte", "lt"]).default("gte"),
  thresholdValue: z.number(),
  thresholdUnit: z.string().min(1),
  evaluationWindowSeconds: z.number().int().positive().nullable().optional(),
  consecutiveFailuresRequired: z.number().int().positive().nullable().optional(),
  cooldownSeconds: z.number().int().nonnegative().nullable().optional(),
  enabled: z.boolean(),
  configSource: z.enum(["seed", "admin_override"]).default("seed"),
  version: z.number().int().nonnegative(),
  updatedAt: isoDatetimeString,
  updatedByUserId: z.string().min(1)
});

export const alertRuleListResponseSchema = z.object({
  items: z.array(alertRuleConfigSchema)
});

export const alertRuleUpdateRequestSchema = z.object({
  version: z.number().int().nonnegative(),
  severity: alertSeveritySchema.optional(),
  comparisonOperator: z.enum(["gte", "gt", "lte", "lt"]).optional(),
  thresholdValue: z.number().optional(),
  thresholdUnit: z.string().trim().min(1).optional(),
  evaluationWindowSeconds: z.number().int().positive().nullable().optional(),
  consecutiveFailuresRequired: z.number().int().positive().nullable().optional(),
  cooldownSeconds: z.number().int().nonnegative().nullable().optional(),
  enabled: z.boolean().optional(),
  reason: z.string().trim().min(1)
});

export const alertRuleMutationResponseSchema = z.object({
  rule: alertRuleConfigSchema,
  audit: mutationAuditSchema
});

export type AlertRuleConfig = z.infer<typeof alertRuleConfigSchema>;
export type AlertRuleListResponse = z.infer<typeof alertRuleListResponseSchema>;
export type AlertRuleUpdateRequest = z.infer<typeof alertRuleUpdateRequestSchema>;
export type AlertRuleMutationResponse = z.infer<typeof alertRuleMutationResponseSchema>;
