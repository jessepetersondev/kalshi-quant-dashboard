import { describe, expect, test } from "vitest";

import { loadFixture } from "@kalshi-quant-dashboard/testing";

import {
  computeMarketPositionProjection,
  detectPnlDisagreement
} from "../../../apps/ingest/src/projections/market-position-projector.js";
import type { PositionSnapshotProjection } from "../../../apps/ingest/src/projections/position-snapshot-projector.js";

describe("PnL edge-case projection", () => {
  test("marks partial fills, partial closes, settlements, stale marks, and disagreement correctly", async () => {
    const partialFill = await loadFixture<{
      strategyId: string;
      marketTicker: string;
      position: PositionSnapshotProjection;
      trades: Array<{ status: string; metadata: Record<string, unknown> }>;
      directSnapshotTotalPnl: number;
    }>("pnl/partial-fill.json");
    const partialClose = await loadFixture<{
      strategyId: string;
      marketTicker: string;
      position: PositionSnapshotProjection;
      trades: Array<{ status: string; metadata: Record<string, unknown> }>;
    }>("pnl/partial-close.json");
    const settlement = await loadFixture<{
      strategyId: string;
      marketTicker: string;
      position: PositionSnapshotProjection;
      trades: Array<{ status: string; metadata: Record<string, unknown> }>;
    }>("pnl/settlement.json");
    const staleMark = await loadFixture<{
      strategyId: string;
      marketTicker: string;
      position: PositionSnapshotProjection;
      trades: Array<{ status: string; metadata: Record<string, unknown> }>;
    }>("pnl/stale-mark.json");
    const disagreement = await loadFixture<{
      strategyId: string;
      marketTicker: string;
      position: PositionSnapshotProjection;
      trades: Array<{ status: string; metadata: Record<string, unknown> }>;
      directSnapshotTotalPnl: number;
    }>("pnl/disagreement.json");

    const rangeEnd = new Date("2026-04-11T12:10:00Z");
    const partialFillProjection = computeMarketPositionProjection({
      position: {
        strategyId: partialFill.strategyId,
        ...partialFill.position
      },
      trades: partialFill.trades,
      rangeEnd
    });
    const partialCloseProjection = computeMarketPositionProjection({
      position: {
        strategyId: partialClose.strategyId,
        ...partialClose.position
      },
      trades: partialClose.trades,
      rangeEnd
    });
    const settlementProjection = computeMarketPositionProjection({
      position: {
        strategyId: settlement.strategyId,
        ...settlement.position
      },
      trades: settlement.trades,
      rangeEnd
    });
    const staleProjection = computeMarketPositionProjection({
      position: {
        strategyId: staleMark.strategyId,
        ...staleMark.position
      },
      trades: staleMark.trades,
      rangeEnd
    });
    const disagreementProjection = computeMarketPositionProjection({
      position: {
        strategyId: disagreement.strategyId,
        ...disagreement.position
      },
      trades: disagreement.trades,
      rangeEnd
    });

    expect(partialFillProjection.partial).toBe(true);
    expect(partialCloseProjection.partial).toBe(true);
    expect(settlementProjection.realizedPnlNet).toBeCloseTo(0.56, 5);
    expect(staleProjection.stale).toBe(true);
    expect(
      detectPnlDisagreement(
        disagreement.directSnapshotTotalPnl,
        disagreementProjection.totalPnlNet
      )
    ).toBe(true);
  });
});
