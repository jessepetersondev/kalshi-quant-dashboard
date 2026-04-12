import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedAnalyticsFacts } from "../../support/phase6.js";

describe.sequential("pnl disagreement reporting", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
    app.capabilityCache.invalidate();
  });

  test("surfaces disagreement counts and mismatched strategy totals", async () => {
    await seedAnalyticsFacts();

    const response = await app.inject({
      method: "GET",
      url: "/api/pnl/timeseries?bucket=all-time&granularity=day&timezone=utc&compare=btc,eth",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().disagreementCount).toBeGreaterThan(0);
    expect(
      response.json().attribution.some((row: { disagreement: boolean }) => row.disagreement)
    ).toBe(true);
    expect(response.json().compare).toHaveLength(2);
  });
});
