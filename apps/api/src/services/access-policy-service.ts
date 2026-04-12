import { ZodError } from "zod";

import {
  accessPolicyCreateRequestSchema,
  accessPolicyDetailResponseSchema,
  accessPolicyListQuerySchema,
  accessPolicyMutationResponseSchema,
  accessPolicyUpdateRequestSchema
} from "@kalshi-quant-dashboard/contracts";
import { AccessPolicyRepo } from "@kalshi-quant-dashboard/db";

import { AdminAuditService } from "./admin-audit-service.js";
import { CapabilityCache } from "../auth/capability-cache.js";
import { normalizePaginationQuery } from "./pagination.js";

function isValidationError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

export class AccessPolicyService {
  constructor(
    private readonly repo = new AccessPolicyRepo(),
    private readonly auditService = new AdminAuditService(),
    private readonly capabilityCache?: CapabilityCache
  ) {}

  parseListQuery(input: unknown) {
    return normalizePaginationQuery(
      "accessPolicies",
      accessPolicyListQuerySchema.parse(input ?? {})
    );
  }

  parseCreate(input: unknown) {
    return accessPolicyCreateRequestSchema.parse(input);
  }

  parseUpdate(input: unknown) {
    return accessPolicyUpdateRequestSchema.parse(input);
  }

  async list(query: unknown) {
    return this.repo.list(this.parseListQuery(query));
  }

  async get(accessPolicyId: string) {
    const detail = await this.repo.getById(accessPolicyId);
    return detail ? accessPolicyDetailResponseSchema.parse(detail) : null;
  }

  async create(actorUserId: string, payload: unknown) {
    try {
      const parsed = this.parseCreate(payload);
      const policy = await this.repo.create(parsed, actorUserId);
      this.capabilityCache?.invalidate();
      const audit = await this.auditService.record({
        actorUserId,
        action: "access_policy.create",
        targetType: "access_policy",
        targetId: policy.accessPolicyId,
        result: "accepted",
        afterState: policy
      });

      return accessPolicyMutationResponseSchema.parse({
        policy,
        audit
      });
    } catch (error) {
      const auditPayload = this.buildRejectedAudit(actorUserId, "access_policy.create", "new", error);
      if (auditPayload) {
        await this.auditService.record(auditPayload);
      }

      throw error;
    }
  }

  async update(actorUserId: string, accessPolicyId: string, payload: unknown) {
    try {
      const parsed = this.parseUpdate(payload);
      const { before, after } = await this.repo.update(accessPolicyId, parsed, actorUserId);
      this.capabilityCache?.invalidate();
      const audit = await this.auditService.record({
        actorUserId,
        action: "access_policy.update",
        targetType: "access_policy",
        targetId: accessPolicyId,
        result: "accepted",
        beforeState: before,
        afterState: after
      });

      return accessPolicyMutationResponseSchema.parse({
        policy: after,
        audit
      });
    } catch (error) {
      const auditPayload = this.buildRejectedAudit(
        actorUserId,
        "access_policy.update",
        accessPolicyId,
        error
      );
      if (auditPayload) {
        await this.auditService.record(auditPayload);
      }

      throw error;
    }
  }

  private buildRejectedAudit(
    actorUserId: string,
    action: "access_policy.create" | "access_policy.update",
    targetId: string,
    error: unknown
  ) {
    if (isValidationError(error)) {
      return {
        actorUserId,
        action,
        targetType: "access_policy",
        targetId,
        result: "rejected" as const,
        reason: "Validation failed.",
        afterState: {
          issues: error.issues
        }
      };
    }

    if ((error as Error).message === "ACCESS_POLICY_VERSION_CONFLICT") {
      return {
        actorUserId,
        action,
        targetType: "access_policy",
        targetId,
        result: "rejected" as const,
        reason: "Version conflict."
      };
    }

    if ((error as Error).message === "ACCESS_POLICY_NOT_FOUND") {
      return {
        actorUserId,
        action,
        targetType: "access_policy",
        targetId,
        result: "rejected" as const,
        reason: "Access policy not found."
      };
    }

    return null;
  }
}
