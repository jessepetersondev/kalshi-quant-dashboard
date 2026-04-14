import { describe, expect, test } from "vitest";

import { AdapterRegistry } from "@kalshi-quant-dashboard/source-adapters";
import { fieldMappings, sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";
import {
  loadSeededStrategyRegistry,
  resolveSourceBindingsForPurpose,
  StrategyRegistry
} from "@kalshi-quant-dashboard/source-adapters";

describe("source adapter base helpers", () => {
  test("register adapters and list them in sorted order", () => {
    const registry = new AdapterRegistry();
    const btcAdapter = {
      variant: "btc-runtime",
      canHandle: (variant: string) => variant === "btc-runtime",
      observe: async () => undefined
    };
    const ethAdapter = {
      variant: "eth-runtime",
      canHandle: (variant: string) => variant === "eth-runtime",
      observe: async () => undefined
    };

    registry.register(ethAdapter);
    registry.register(btcAdapter);

    expect(registry.get("btc-runtime")).toBe(btcAdapter);
    expect(registry.list()).toEqual(["btc-runtime", "eth-runtime"]);
    expect(() => registry.get("missing")).toThrow("No source adapter registered");
  });

  test("resolve source bindings by purpose, strategy, and priority", () => {
    const strategy = {
      strategyId: "btc",
      symbol: "BTC",
      repoName: "kalshi-btc-quant",
      sourcePathMode: "hybrid",
      baseUrl: "http://btc.test",
      healthPath: "/health",
      statusPath: "/status",
      positionsPath: "/positions",
      tradesPath: "/trades",
      ordersPath: "/orders",
      pnlPath: "/pnl",
      realizedPnlPath: "/pnl/realized"
    } as const;

    const resolved = resolveSourceBindingsForPurpose(
      [
        {
          sourceBindingId: "global-trades",
          sourceProfileKey: "publisherEnvelopeV1",
          priority: 20,
          usedFor: ["trades"]
        },
        {
          sourceBindingId: "btc-trades",
          strategyId: "btc",
          sourceProfileKey: "quantTradesV1",
          priority: 5,
          usedFor: ["trades", "positions"]
        },
        {
          sourceBindingId: "eth-trades",
          strategyId: "eth",
          sourceProfileKey: "quantTradesV1",
          priority: 1,
          usedFor: ["trades"]
        }
      ],
      strategy,
      "trades"
    );

    expect(resolved.map((binding) => binding.sourceBindingId)).toEqual([
      "btc-trades",
      "global-trades"
    ]);
  });

  test("load seeded strategies and compatibility artifacts", () => {
    const registry = loadSeededStrategyRegistry();
    const strategyList = registry.list();

    expect(strategyList).toHaveLength(4);
    expect(registry.get("btc")).toMatchObject({
      sourcePathMode: "hybrid",
      dashboardLivePath: "/api/dashboard/live"
    });
    expect(registry.get("sol")).toMatchObject({
      sourcePathMode: "direct_only",
      skipDiagnosticsPath: "/api/no-trade-diagnostics?reason_limit=5"
    });
    expect(new StrategyRegistry(strategyList).get("xrp")).toMatchObject({
      strategyId: "xrp"
    });

    expect(fieldMappings.some((mapping) => mapping.sourceVariant === "publisher-envelope-v1")).toBe(
      true
    );
    expect(sourceProfiles.standaloneExecutorV1.sourceSystem).toBe("executor");
    expect(sourceProfiles.quantNoTradeDiagnosticsV1.capabilities).toContain("skip_only");
  });
});
