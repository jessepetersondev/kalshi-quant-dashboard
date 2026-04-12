import { z } from "zod";

import {
  adminSurfaceSchema,
  exportColumnProfileSchema,
  exportResourceSchema,
  policyEffectSchema,
  policyRuleTypeSchema,
  roleSchema,
  subjectTypeSchema
} from "../shared.js";

export const roleBindingSchema = z.object({
  roleBindingId: z.string().uuid().or(z.string().min(1)),
  userId: z.string().min(1),
  role: roleSchema,
  strategyScope: z.array(z.string()).min(1),
  active: z.boolean().default(true)
});

export const accessPolicySchema = z.object({
  accessPolicyId: z.string().uuid().or(z.string().min(1)),
  subjectType: subjectTypeSchema,
  subjectKey: z.string().min(1),
  name: z.string().min(1),
  description: z.string().trim().max(500).nullable().optional(),
  precedence: z.number().int(),
  enabled: z.boolean().default(true),
  version: z.number().int().nonnegative().default(0)
});

export const accessPolicyRuleSchema = z.object({
  accessPolicyRuleId: z.string().uuid().or(z.string().min(1)),
  accessPolicyId: z.string().uuid().or(z.string().min(1)),
  ruleType: policyRuleTypeSchema,
  effect: policyEffectSchema,
  strategyScope: z.array(z.string()).optional(),
  adminSurfaces: z.array(adminSurfaceSchema).optional(),
  enabled: z.boolean().default(true),
  notes: z.string().trim().max(500).nullable().optional()
}).superRefine((value, context) => {
  if (value.ruleType === "strategy_scope" && (!value.strategyScope || value.strategyScope.length === 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "strategyScope is required when ruleType is strategy_scope.",
      path: ["strategyScope"]
    });
  }

  if (value.ruleType === "admin_surface" && (!value.adminSurfaces || value.adminSurfaces.length === 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "adminSurfaces is required when ruleType is admin_surface.",
      path: ["adminSurfaces"]
    });
  }
});

export const exportScopeGrantSchema = z.object({
  exportScopeGrantId: z.string().uuid().or(z.string().min(1)),
  accessPolicyId: z.string().uuid().or(z.string().min(1)),
  resource: exportResourceSchema,
  strategyScope: z.array(z.string()).min(1),
  columnProfile: exportColumnProfileSchema,
  enabled: z.boolean().default(true)
});

export type RoleBinding = z.infer<typeof roleBindingSchema>;
export type AccessPolicy = z.infer<typeof accessPolicySchema>;
export type AccessPolicyRule = z.infer<typeof accessPolicyRuleSchema>;
export type ExportScopeGrant = z.infer<typeof exportScopeGrantSchema>;
