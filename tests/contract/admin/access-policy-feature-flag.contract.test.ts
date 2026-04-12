import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  accessPolicyCreateRequestSchema,
  accessPolicyDetailResponseSchema,
  accessPolicyMutationResponseSchema,
  alertRuleListResponseSchema,
  alertRuleMutationResponseSchema,
  auditLogListResponseSchema,
  featureFlagListResponseSchema,
  featureFlagMutationSchema,
  featureFlagMutationResponseSchema
} from "@kalshi-quant-dashboard/contracts";

function readArtifact(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("admin mutation contracts", () => {
  test("parse access policy create and mutation responses", () => {
    const createPayload = accessPolicyCreateRequestSchema.parse({
      policy: {
        subjectType: "user",
        subjectKey: "user-developer",
        name: "Developer admin controls",
        precedence: 100,
        enabled: true
      },
      rules: [
        {
          ruleType: "admin_surface",
          effect: "allow",
          adminSurfaces: ["access_policies"]
        }
      ],
      exportGrants: []
    });

    const detail = accessPolicyDetailResponseSchema.parse({
      policy: {
        accessPolicyId: "policy-1",
        subjectType: "user",
        subjectKey: "user-developer",
        name: "Developer admin controls",
        precedence: 100,
        enabled: true,
        version: 0,
        updatedAt: "2026-04-11T12:00:00Z",
        updatedByUserId: "user-admin",
        rules: [
          {
            accessPolicyRuleId: "rule-1",
            accessPolicyId: "policy-1",
            ruleType: "admin_surface",
            effect: "allow",
            adminSurfaces: ["access_policies"],
            enabled: true
          }
        ],
        exportGrants: [],
        effectiveCapabilityPreview: [],
        auditTrail: []
      }
    });

    const mutation = accessPolicyMutationResponseSchema.parse({
      policy: detail.policy,
      audit: {
        auditLogId: "audit-1",
        result: "accepted",
        occurredAt: "2026-04-11T12:00:00Z",
        actorUserId: "user-admin"
      }
    });

    expect(createPayload.rules[0]?.adminSurfaces?.[0]).toBe("access_policies");
    expect(mutation.audit.result).toBe("accepted");
  });

  test("parse feature flag, alert rule, and audit log contracts", () => {
    const flagList = featureFlagListResponseSchema.parse({
      items: [
        {
          featureFlagKey: "adminControlsEnabled",
          enabled: true,
          description: "Enable admin controls.",
          version: 1,
          updatedAt: "2026-04-11T12:00:00Z",
          updatedByUserId: "user-admin"
        }
      ]
    });
    const flagMutation = featureFlagMutationResponseSchema.parse({
      flag: flagList.items[0],
      audit: {
        auditLogId: "audit-2",
        result: "accepted",
        occurredAt: "2026-04-11T12:00:00Z",
        actorUserId: "user-admin"
      }
    });
    const alertRuleList = alertRuleListResponseSchema.parse({
      items: [
        {
          alertRuleId: "alert-rule-backlog-age",
          ruleKey: "queue_backlog_age_default",
          alertType: "queue_backlog_age",
          scopeType: "queue",
          scopeKey: "kalshi.integration.executor",
          severity: "warning",
          comparisonOperator: "gte",
          thresholdValue: 30,
          thresholdUnit: "seconds",
          evaluationWindowSeconds: null,
          consecutiveFailuresRequired: null,
          cooldownSeconds: null,
          enabled: true,
          configSource: "seed",
          version: 0,
          updatedAt: "2026-04-11T12:00:00Z",
          updatedByUserId: "user-admin"
        }
      ]
    });
    const alertRuleMutation = alertRuleMutationResponseSchema.parse({
      rule: alertRuleList.items[0],
      audit: {
        auditLogId: "audit-3",
        result: "accepted",
        occurredAt: "2026-04-11T12:00:00Z",
        actorUserId: "user-admin"
      }
    });
    const auditLogs = auditLogListResponseSchema.parse({
      items: [
        {
          auditLogId: "audit-4",
          actorUserId: "user-admin",
          action: "feature_flag.update",
          targetType: "feature_flag",
          targetId: "adminControlsEnabled",
          result: "accepted",
          reason: null,
          beforeState: null,
          afterState: null,
          occurredAt: "2026-04-11T12:00:00Z"
        }
      ],
      pageInfo: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1
      }
    });

    expect(flagMutation.flag.featureFlagKey).toBe("adminControlsEnabled");
    expect(alertRuleMutation.rule.ruleKey).toBe("queue_backlog_age_default");
    expect(auditLogs.items[0]?.targetType).toBe("feature_flag");
  });

  test("keep OpenAPI feature-flag schemas aligned with runtime contracts", () => {
    const openApi = readArtifact(
      "specs/001-quant-ops-dashboard/contracts/rest-api.openapi.yaml"
    );
    const requestBlock = openApi.match(
      /FeatureFlagUpdateRequest:[\s\S]*?(?=\n\s{4}FeatureFlagMutationResponse:)/
    )?.[0];
    const responseBlock = openApi.match(
      /FeatureFlagMutationResponse:[\s\S]*?(?=\n\s{4}MutationAuditInfo:)/
    )?.[0];
    const stateBlock = openApi.match(
      /FeatureFlagState:[\s\S]*?(?=\n\s{4}FeatureFlagUpdateRequest:)/
    )?.[0];

    expect(
      featureFlagMutationSchema.parse({
        enabled: true,
        version: 1,
        reason: "enable admin controls"
      })
    ).toBeTruthy();
    expect(requestBlock).toContain("required: [version, enabled, reason]");
    expect(responseBlock).toContain("required: [flag, audit]");
    expect(responseBlock).toContain("flag:");
    expect(responseBlock).not.toContain("featureFlag:");
    expect(stateBlock).toContain("featureFlagKey:");
    expect(stateBlock).not.toContain("scopeType:");
    expect(stateBlock).not.toContain("lastValidationError:");
  });
});
