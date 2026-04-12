import { z } from "zod";

import {
  detailLevelSchema,
  exportColumnProfileSchema,
  exportResourceSchema,
  isoDatetimeString,
  roleSchema
} from "../shared.js";

export const allowedExportResourceSchema = z.object({
  resource: exportResourceSchema,
  strategyScope: z.array(z.string()).min(1),
  columnProfile: exportColumnProfileSchema
});

export const effectiveCapabilitySchema = z.object({
  resolvedRole: roleSchema,
  strategyScope: z.array(z.string()).min(1),
  detailLevelMax: detailLevelSchema,
  canViewRawPayloads: z.boolean(),
  canViewPrivilegedAuditLogs: z.boolean(),
  canManageAlertRules: z.boolean(),
  canManageFeatureFlags: z.boolean(),
  canManageAccessPolicies: z.boolean(),
  allowedExportResources: z.array(allowedExportResourceSchema),
  resolutionVersion: z.string().min(1),
  resolvedAt: isoDatetimeString.optional()
});

export type AllowedExportResource = z.infer<typeof allowedExportResourceSchema>;
export type EffectiveCapability = z.infer<typeof effectiveCapabilitySchema>;
