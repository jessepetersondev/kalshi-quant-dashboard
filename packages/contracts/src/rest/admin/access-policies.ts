import { z } from "zod";

import {
  accessPolicyRuleSchema,
  accessPolicySchema,
  exportScopeGrantSchema
} from "../../auth/rbac.js";
import { effectiveCapabilitySchema } from "../../auth/effective-capabilities.js";
import {
  adminSurfaceSchema,
  isoDatetimeString,
  policyEffectSchema,
  policyRuleTypeSchema
} from "../../shared.js";
import {
  mutationAuditSchema,
  pageInfoSchema,
  queryPageSchema,
  queryPageSizeSchema
} from "../common.js";

export const accessPolicyListQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  search: z.string().trim().optional()
});

export const accessPolicyListItemSchema = accessPolicySchema.extend({
  updatedAt: isoDatetimeString,
  updatedByUserId: z.string().min(1)
});

export const accessPolicyDetailSchema = accessPolicyListItemSchema.extend({
  rules: z.array(accessPolicyRuleSchema),
  exportGrants: z.array(exportScopeGrantSchema),
  effectiveCapabilityPreview: z.array(effectiveCapabilitySchema),
  auditTrail: z.array(
    mutationAuditSchema.extend({
      action: z.string().min(1)
    })
  )
});

export const accessPolicyListResponseSchema = z.object({
  items: z.array(accessPolicyListItemSchema),
  pageInfo: pageInfoSchema
});

export const accessPolicyDetailResponseSchema = z.object({
  policy: accessPolicyDetailSchema
});

export const accessPolicyRuleInputSchema = z.object({
  ruleType: policyRuleTypeSchema,
  effect: policyEffectSchema,
  strategyScope: z.array(z.string()).optional(),
  adminSurfaces: z.array(adminSurfaceSchema).optional(),
  enabled: z.boolean().default(true),
  notes: z.string().trim().max(500).nullable().optional()
}).superRefine((value, context) => {
  if (
    value.ruleType === "strategy_scope" &&
    (!Array.isArray(value.strategyScope) || value.strategyScope.length === 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "strategyScope is required when ruleType is strategy_scope.",
      path: ["strategyScope"]
    });
  }

  if (
    value.ruleType === "admin_surface" &&
    (!Array.isArray(value.adminSurfaces) || value.adminSurfaces.length === 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "adminSurfaces is required when ruleType is admin_surface.",
      path: ["adminSurfaces"]
    });
  }
});

export const exportScopeGrantInputSchema = z.object({
  resource: exportScopeGrantSchema.shape.resource,
  strategyScope: z.array(z.string()).min(1),
  columnProfile: exportScopeGrantSchema.shape.columnProfile,
  enabled: z.boolean().default(true)
});

export const accessPolicyCreateRequestSchema = z.object({
  policy: accessPolicySchema.omit({ accessPolicyId: true, version: true }),
  rules: z.array(accessPolicyRuleInputSchema),
  exportGrants: z.array(exportScopeGrantInputSchema)
});

export const accessPolicyUpdateRequestSchema = z.object({
  version: z.number().int().nonnegative(),
  policy: accessPolicySchema.omit({ accessPolicyId: true, version: true }).partial(),
  rules: z.array(accessPolicyRuleInputSchema),
  exportGrants: z.array(exportScopeGrantInputSchema)
});

export const accessPolicyMutationSchema = accessPolicyUpdateRequestSchema;

export const accessPolicyMutationResponseSchema = z.object({
  policy: accessPolicyDetailSchema,
  audit: mutationAuditSchema
});

export type AccessPolicyListQuery = z.infer<typeof accessPolicyListQuerySchema>;
export type AccessPolicyListItem = z.infer<typeof accessPolicyListItemSchema>;
export type AccessPolicyDetail = z.infer<typeof accessPolicyDetailSchema>;
export type AccessPolicyListResponse = z.infer<typeof accessPolicyListResponseSchema>;
export type AccessPolicyDetailResponse = z.infer<typeof accessPolicyDetailResponseSchema>;
export type AccessPolicyRuleInput = z.infer<typeof accessPolicyRuleInputSchema>;
export type ExportScopeGrantInput = z.infer<typeof exportScopeGrantInputSchema>;
export type AccessPolicyCreateRequest = z.infer<typeof accessPolicyCreateRequestSchema>;
export type AccessPolicyUpdateRequest = z.infer<typeof accessPolicyUpdateRequestSchema>;
export type AccessPolicyMutation = z.infer<typeof accessPolicyMutationSchema>;
export type AccessPolicyMutationResponse = z.infer<typeof accessPolicyMutationResponseSchema>;
