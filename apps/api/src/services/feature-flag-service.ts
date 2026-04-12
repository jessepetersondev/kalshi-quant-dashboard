import { ZodError } from "zod";

import {
  featureFlagListResponseSchema,
  featureFlagMutationResponseSchema,
  featureFlagMutationSchema
} from "@kalshi-quant-dashboard/contracts";
import { FeatureFlagRepo } from "@kalshi-quant-dashboard/db";

import { AdminAuditService } from "./admin-audit-service.js";

function isValidationError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

export class FeatureFlagService {
  constructor(
    private readonly repo = new FeatureFlagRepo(),
    private readonly auditService = new AdminAuditService()
  ) {}

  parseMutation(input: unknown) {
    return featureFlagMutationSchema.parse(input);
  }

  async list() {
    return featureFlagListResponseSchema.parse({
      items: await this.repo.list()
    });
  }

  async update(actorUserId: string, featureFlagKey: string, payload: unknown) {
    try {
      const parsed = this.parseMutation(payload);
      const { before, after } = await this.repo.update(featureFlagKey, parsed, actorUserId);
      const audit = await this.auditService.record({
        actorUserId,
        action: "feature_flag.update",
        targetType: "feature_flag",
        targetId: featureFlagKey,
        result: "accepted",
        beforeState: before,
        afterState: {
          ...after,
          reason: parsed.reason
        }
      });

      return featureFlagMutationResponseSchema.parse({
        flag: after,
        audit
      });
    } catch (error) {
      const auditPayload = this.buildRejectedAudit(actorUserId, featureFlagKey, error);
      if (auditPayload) {
        await this.auditService.record(auditPayload);
      }

      throw error;
    }
  }

  private buildRejectedAudit(actorUserId: string, featureFlagKey: string, error: unknown) {
    if (isValidationError(error)) {
      return {
        actorUserId,
        action: "feature_flag.update",
        targetType: "feature_flag",
        targetId: featureFlagKey,
        result: "rejected" as const,
        reason: "Validation failed.",
        afterState: {
          issues: error.issues
        }
      };
    }

    if ((error as Error).message === "FEATURE_FLAG_VERSION_CONFLICT") {
      return {
        actorUserId,
        action: "feature_flag.update",
        targetType: "feature_flag",
        targetId: featureFlagKey,
        result: "rejected" as const,
        reason: "Version conflict."
      };
    }

    if ((error as Error).message === "FEATURE_FLAG_NOT_FOUND") {
      return {
        actorUserId,
        action: "feature_flag.update",
        targetType: "feature_flag",
        targetId: featureFlagKey,
        result: "rejected" as const,
        reason: "Feature flag not found."
      };
    }

    return null;
  }
}
