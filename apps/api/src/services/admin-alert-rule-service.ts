import { ZodError } from "zod";

import {
  alertRuleListResponseSchema,
  alertRuleMutationResponseSchema,
  alertRuleUpdateRequestSchema
} from "@kalshi-quant-dashboard/contracts";
import { AlertRuleConfigRepo } from "@kalshi-quant-dashboard/db";

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

export class AdminAlertRuleService {
  constructor(
    private readonly repo = new AlertRuleConfigRepo(),
    private readonly auditService = new AdminAuditService()
  ) {}

  parseMutation(input: unknown) {
    return alertRuleUpdateRequestSchema.parse(input);
  }

  async list() {
    return alertRuleListResponseSchema.parse({
      items: await this.repo.list()
    });
  }

  async update(actorUserId: string, alertRuleId: string, payload: unknown) {
    try {
      const parsed = this.parseMutation(payload);
      const { before, after } = await this.repo.update(alertRuleId, parsed, actorUserId);
      const audit = await this.auditService.record({
        actorUserId,
        action: "alert_rule.update",
        targetType: "alert_rule",
        targetId: alertRuleId,
        result: "accepted",
        beforeState: before,
        afterState: {
          ...after,
          reason: parsed.reason
        }
      });

      return alertRuleMutationResponseSchema.parse({
        rule: after,
        audit
      });
    } catch (error) {
      const auditPayload = this.buildRejectedAudit(actorUserId, alertRuleId, error);
      if (auditPayload) {
        await this.auditService.record(auditPayload);
      }

      throw error;
    }
  }

  private buildRejectedAudit(actorUserId: string, alertRuleId: string, error: unknown) {
    if (isValidationError(error)) {
      return {
        actorUserId,
        action: "alert_rule.update",
        targetType: "alert_rule",
        targetId: alertRuleId,
        result: "rejected" as const,
        reason: "Validation failed.",
        afterState: {
          issues: error.issues
        }
      };
    }

    if ((error as Error).message === "ALERT_RULE_VERSION_CONFLICT") {
      return {
        actorUserId,
        action: "alert_rule.update",
        targetType: "alert_rule",
        targetId: alertRuleId,
        result: "rejected" as const,
        reason: "Version conflict."
      };
    }

    if ((error as Error).message === "ALERT_RULE_NOT_FOUND") {
      return {
        actorUserId,
        action: "alert_rule.update",
        targetType: "alert_rule",
        targetId: alertRuleId,
        result: "rejected" as const,
        reason: "Alert rule not found."
      };
    }

    return null;
  }
}
