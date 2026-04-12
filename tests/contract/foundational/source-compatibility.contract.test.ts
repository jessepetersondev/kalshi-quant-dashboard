import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import {
  fieldMappings,
  sourceProfiles
} from "@kalshi-quant-dashboard/source-adapters";

describe("foundational source compatibility matrix", () => {
  test("covers the mixed-source variants required for the first release", () => {
    expect(sourceProfiles.publisherEnvelopeV1.sourceVariant).toBe("publisher-envelope-v1");
    expect(sourceProfiles.publisherResultV1.sourceVariant).toBe("publisher-result-v1");
    expect(sourceProfiles.quantStatusV1.sourceVariant).toBe("quant-runtime-v1");
    expect(sourceProfiles.quantPositionsV1.sourceVariant).toBe("quant-positions-v1");
    expect(sourceProfiles.quantNoTradeDiagnosticsV1.sourceVariant).toBe(
      "quant-no-trade-diagnostics-v1"
    );
    expect(sourceProfiles.rabbitMqManagementV1.sourceVariant).toBe(
      "rabbitmq-management-v1"
    );
  });

  test("documents skip-only and position mapping rules", async () => {
    expect(
      fieldMappings.some(
        (mapping) =>
          mapping.sourceVariant === "quant-no-trade-diagnostics-v1" &&
          mapping.rule.includes("first-class")
      )
    ).toBe(true);
    expect(
      fieldMappings.some(
        (mapping) =>
          mapping.sourceVariant === "quant-positions-v1" &&
          mapping.canonicalField === "position_snapshot"
      )
    ).toBe(true);

    const compatibilityDoc = await readFile("docs/schema/source-compatibility.md", "utf8");
    expect(compatibilityDoc).toContain("position_snapshot");
    expect(compatibilityDoc).toContain("skip");
  });
});
