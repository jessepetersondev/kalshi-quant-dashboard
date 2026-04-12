import { describe, expect, test } from "vitest";

import { loadFixture } from "@kalshi-quant-dashboard/testing";

import { computeMarketPositionProjection } from "../../../apps/ingest/src/projections/market-position-projector.js";
import type { PositionSnapshotProjection } from "../../../apps/ingest/src/projections/position-snapshot-projector.js";

describe("PnL fee allocation", () => {
  test("allocates trade fees and open-position fees into net realized and unrealized pnl", async () => {
    const fixture = await loadFixture<{
      strategyId: string;
      position: PositionSnapshotProjection;
      trades: Array<{ status: string; metadata: Record<string, unknown> }>;
    }>("pnl/partial-fill.json");

    const row = computeMarketPositionProjection({
      position: {
        strategyId: fixture.strategyId,
        ...fixture.position
      },
      trades: fixture.trades,
      rangeEnd: new Date("2026-04-11T12:10:00Z")
    });

    expect(row.feesTotal).toBeCloseTo(0.05, 5);
    expect(row.realizedPnlNet).toBeCloseTo(0.07, 5);
    expect(row.unrealizedPnlNet).toBeCloseTo(0.43, 5);
    expect(row.totalPnlNet).toBeCloseTo(0.5, 5);
  });
});
