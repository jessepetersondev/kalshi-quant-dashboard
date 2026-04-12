import { z } from "zod";

import { isoDatetimeString } from "../../shared.js";
import { mutationAuditSchema } from "../common.js";

export const featureFlagStateSchema = z.object({
  featureFlagKey: z.string().min(1),
  enabled: z.boolean(),
  description: z.string().min(1),
  updatedAt: isoDatetimeString,
  updatedByUserId: z.string().min(1),
  version: z.number().int().nonnegative()
});

export const featureFlagListResponseSchema = z.object({
  items: z.array(featureFlagStateSchema)
});

export const featureFlagMutationSchema = z.object({
  enabled: z.boolean(),
  version: z.number().int().nonnegative(),
  reason: z.string().trim().min(1)
});

export const featureFlagMutationResponseSchema = z.object({
  flag: featureFlagStateSchema,
  audit: mutationAuditSchema
});

export type FeatureFlagState = z.infer<typeof featureFlagStateSchema>;
export type FeatureFlagListResponse = z.infer<typeof featureFlagListResponseSchema>;
export type FeatureFlagMutation = z.infer<typeof featureFlagMutationSchema>;
export type FeatureFlagMutationResponse = z.infer<typeof featureFlagMutationResponseSchema>;
