import { describe, expect, test } from "vitest";

import {
  alertRuleListResponseSchema,
  alertRuleUpdateRequestSchema
} from "@kalshi-quant-dashboard/contracts";

describe("admin alert rule contracts", () => {
  test("parse alert rule list and mutation payloads", () => {
    const list = alertRuleListResponseSchema.parse({
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
    const update = alertRuleUpdateRequestSchema.parse({
      version: 0,
      thresholdValue: 60,
      thresholdUnit: "seconds",
      enabled: true,
      reason: "Loosen backlog threshold for testing"
    });

    expect(list.items[0]?.alertRuleId).toBe("alert-rule-backlog-age");
    expect(update.thresholdValue).toBe(60);
  });
});
