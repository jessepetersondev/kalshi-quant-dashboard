import { describe, expect, test } from "vitest";

import {
  accessPolicyMutationSchema,
  featureFlagMutationSchema
} from "@kalshi-quant-dashboard/contracts";

describe("foundational admin mutation contracts", () => {
  test("accept valid access policy and feature flag mutations", () => {
    const accessPolicy = accessPolicyMutationSchema.parse({
      version: 2,
      policy: {
        subjectType: "user",
        subjectKey: "user-operator",
        name: "Operator restricted export scope",
        precedence: 50,
        enabled: true,
        version: 2
      },
      rules: [
        {
          ruleType: "strategy_scope",
          effect: "allow",
          strategyScope: ["btc", "eth"]
        }
      ],
      exportGrants: [
        {
          resource: "decisions",
          strategyScope: ["btc"],
          columnProfile: "summary"
        }
      ]
    });
    const featureFlag = featureFlagMutationSchema.parse({
      enabled: true,
      version: 1,
      reason: "Enable foundational rollout"
    });

    expect(accessPolicy.policy.subjectKey).toBe("user-operator");
    expect(featureFlag.reason).toBe("Enable foundational rollout");
  });

  test("reject invalid feature flag mutation payloads", () => {
    expect(() =>
      featureFlagMutationSchema.parse({
        enabled: true,
        version: -1,
        reason: ""
      })
    ).toThrow();
  });
});
