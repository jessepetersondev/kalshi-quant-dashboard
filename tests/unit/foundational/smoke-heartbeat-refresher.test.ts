import { describe, expect, test, vi } from "vitest";

import { SmokeHeartbeatRefresher } from "../../../apps/ingest/src/runtime/smoke-heartbeat-refresher.js";

describe("smoke heartbeat refresher", () => {
  test("emits fresh heartbeat payloads for each seeded strategy", async () => {
    const ingest = {
      ingest: vi.fn().mockResolvedValue({ insertedFacts: 1, duplicateObservations: 0 })
    };
    const refresher = new SmokeHeartbeatRefresher(ingest, [
      {
        strategyId: "btc",
        symbol: "BTC",
        repoName: "kalshi-btc-quant",
        sourcePathMode: "hybrid",
        baseUrl: "http://btc.invalid",
        healthPath: "/health",
        statusPath: "/api/status",
        positionsPath: "/api/positions",
        tradesPath: "/api/trades?limit=50",
        ordersPath: "/api/orders?limit=50",
        pnlPath: "/api/pnl",
        realizedPnlPath: "/api/pnl/realized",
        dashboardLivePath: "/api/dashboard/live"
      },
      {
        strategyId: "eth",
        symbol: "ETH",
        repoName: "kalshi-eth-quant",
        sourcePathMode: "direct_only",
        baseUrl: "http://eth.invalid",
        healthPath: "/health",
        statusPath: "/api/status",
        positionsPath: "/api/positions",
        tradesPath: "/api/trades?limit=50",
        ordersPath: "/api/orders?limit=50",
        pnlPath: "/api/pnl",
        realizedPnlPath: "/api/pnl/realized"
      }
    ]);

    await refresher.refresh("2026-04-13T18:50:00.000Z");

    expect(ingest.ingest).toHaveBeenCalledTimes(2);
    expect(ingest.ingest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sourceRepo: "kalshi-btc-quant",
        strategyId: "btc",
        payload: expect.objectContaining({
          asset: "BTC",
          last_scan_at: "2026-04-13T18:50:00.000Z",
          halted: false
        })
      })
    );
    expect(ingest.ingest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sourceRepo: "kalshi-eth-quant",
        strategyId: "eth",
        payload: expect.objectContaining({
          asset: "ETH",
          last_scan_at: "2026-04-13T18:50:00.000Z",
          halted: false
        })
      })
    );
  });
});
