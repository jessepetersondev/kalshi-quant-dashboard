import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedAnalyticsFacts } from "../../support/phase6.js";

describe.sequential("compare-mode analytics queries", () => {
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

  test("returns compare-mode summary and timeseries slices for selected strategies", async () => {
    await seedAnalyticsFacts();

    const summary = await app.inject({
      method: "GET",
      url: "/api/pnl/summary?bucket=all-time&timezone=utc&compare=btc,eth",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const timeseries = await app.inject({
      method: "GET",
      url: "/api/pnl/timeseries?bucket=all-time&granularity=day&timezone=utc&compare=btc,eth",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(summary.statusCode).toBe(200);
    expect(summary.json().compare).toHaveLength(2);
    expect(timeseries.statusCode).toBe(200);
    expect(timeseries.json().compare).toHaveLength(2);
  });
});
