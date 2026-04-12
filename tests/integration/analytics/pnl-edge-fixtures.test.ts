import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { projectMarketPositionAttribution } from "../../../apps/ingest/src/projections/market-position-projector.js";
import { insertPnlScenarioFixture } from "../../support/phase6.js";

describe.sequential("pnl edge fixtures", () => {
  beforeAll(async () => {
    await bootstrapTestDatabase();
  });

  afterAll(async () => {
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
  });

  test("project the seeded edge-case fixtures into consistent market attribution rows", async () => {
    await insertPnlScenarioFixture("pnl/partial-fill.json");
    await insertPnlScenarioFixture("pnl/partial-close.json");
    await insertPnlScenarioFixture("pnl/settlement.json");
    await insertPnlScenarioFixture("pnl/stale-mark.json");

    const rows = await projectMarketPositionAttribution({
      strategyScope: ["btc", "eth", "sol", "xrp"]
    });

    expect(rows).toHaveLength(4);
    expect(rows.find((row) => row.marketTicker === "KXBTCD-PARTIAL-FILL")?.partial).toBe(true);
    expect(rows.find((row) => row.marketTicker === "KXETHD-PARTIAL-CLOSE")?.partial).toBe(true);
    expect(rows.find((row) => row.marketTicker === "KXSOLD-SETTLED")?.realizedPnlNet).toBeGreaterThan(0);
    expect(rows.find((row) => row.marketTicker === "KXXRPD-STALE")?.stale).toBe(true);
  });
});
