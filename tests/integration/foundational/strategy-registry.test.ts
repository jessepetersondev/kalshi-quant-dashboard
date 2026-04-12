import { describe, expect, test } from "vitest";

import { loadSeededStrategyRegistry } from "@kalshi-quant-dashboard/source-adapters";

import { buildMixedSourceRuntime } from "../../../apps/ingest/src/runtime/build-mixed-source-runtime.js";
import { SourceIngestService } from "../../../apps/ingest/src/services/source-ingest-service.js";

describe.sequential("foundational strategy registry boot", () => {
  test("loads configured strategies and mixed-source collectors without asset-specific branches", () => {
    const registry = loadSeededStrategyRegistry();
    const runtime = buildMixedSourceRuntime(new SourceIngestService());

    expect(registry.list().map((strategy) => strategy.strategyId)).toEqual([
      "btc",
      "eth",
      "sol",
      "xrp"
    ]);
    expect(registry.get("btc")?.sourcePathMode).toBe("hybrid");
    expect(registry.get("sol")?.skipDiagnosticsPath).toContain("/api/no-trade-diagnostics");
    expect(runtime.collectors.some((collector) => collector.name === "btc-positions")).toBe(
      true
    );
    expect(
      runtime.collectors.some((collector) => collector.name === "sol-skip-diagnostics")
    ).toBe(true);
    expect(runtime.consumers.map((consumer) => consumer.name)).toEqual([
      "publisher-envelope-consumer",
      "publisher-results-consumer",
      "executor-results-consumer"
    ]);
    expect(runtime.consumers.every((consumer) => typeof consumer.start === "function")).toBe(true);
    expect(runtime.consumers.every((consumer) => typeof consumer.stop === "function")).toBe(true);
  });
});
