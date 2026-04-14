import { describe, expect, test } from "vitest";

import { AlertEvaluator } from "../../../apps/ingest/src/alerts/alert-evaluator.js";

describe("alert rule evaluator", () => {
  test("triggers when the sampled value crosses the threshold", () => {
    const evaluator = new AlertEvaluator();
    const result = evaluator.evaluate(
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
      },
      {
        value: 45
      }
    );

    expect(result.triggered).toBe(true);
    expect(result.severity).toBe("warning");
  });

  test("evaluates missing-heartbeat freshness with the configured threshold", () => {
    const evaluator = new AlertEvaluator();
    const result = evaluator.evaluate(
      {
        alertRuleId: "alert-rule-missing-heartbeat",
        ruleKey: "missing_heartbeat_default",
        alertType: "missing_heartbeat",
        scopeType: "strategy",
        scopeKey: "*",
        severity: "critical",
        comparisonOperator: "gte",
        thresholdValue: 120,
        thresholdUnit: "seconds",
        evaluationWindowSeconds: null,
        consecutiveFailuresRequired: null,
        cooldownSeconds: null,
        enabled: true,
        configSource: "seed",
        version: 0,
        updatedAt: "2026-04-11T12:00:00Z",
        updatedByUserId: "user-admin"
      },
      {
        value: 121
      }
    );

    expect(result.triggered).toBe(true);
    expect(result.severity).toBe("critical");
  });

  test("supports less-than comparisons without triggering above threshold", () => {
    const evaluator = new AlertEvaluator();
    const result = evaluator.evaluate(
      {
        alertRuleId: "alert-rule-latency-lte",
        ruleKey: "queue_latency_fast_enough",
        alertType: "queue_backlog_age",
        scopeType: "queue",
        scopeKey: "kalshi.integration.executor",
        severity: "info",
        comparisonOperator: "lte",
        thresholdValue: 50,
        thresholdUnit: "milliseconds",
        evaluationWindowSeconds: null,
        consecutiveFailuresRequired: null,
        cooldownSeconds: null,
        enabled: true,
        configSource: "seed",
        version: 0,
        updatedAt: "2026-04-11T12:00:00Z",
        updatedByUserId: "user-admin"
      },
      {
        value: 75
      }
    );

    expect(result.triggered).toBe(false);
    expect(result.severity).toBe("info");
  });
});
