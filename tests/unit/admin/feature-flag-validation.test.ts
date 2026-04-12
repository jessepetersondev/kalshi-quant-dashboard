import { describe, expect, test } from "vitest";

import { featureFlagMutationSchema } from "@kalshi-quant-dashboard/contracts";

describe("feature flag validation", () => {
  test("rejects empty mutation reasons", () => {
    expect(() =>
      featureFlagMutationSchema.parse({
        enabled: true,
        version: 0,
        reason: ""
      })
    ).toThrow();
  });
});
