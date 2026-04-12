import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { skipUpsertEventSchema } from "@kalshi-quant-dashboard/contracts";
import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedAnalyticsFacts } from "../../support/phase6.js";

describe.sequential("skip-only diagnostics and pnl reconciliation", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app?.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
    app.capabilityCache.invalidate();
  });

  test("returns skip-only diagnostics as first-class skip facts and reconciled pnl summaries", async () => {
    await seedAnalyticsFacts();

    const skips = await app.inject({
      method: "GET",
      url: "/api/skips?page=1&pageSize=50&range=all-time&timezone=utc",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const pnl = await app.inject({
      method: "GET",
      url: "/api/pnl/summary?bucket=all-time&timezone=utc",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const skipExport = await app.inject({
      method: "GET",
      url: "/api/exports/skips.csv?range=all-time&timezone=utc&strategy=btc",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const pnlExport = await app.inject({
      method: "GET",
      url: "/api/exports/pnl.csv?bucket=all-time&timezone=utc&compare=btc,eth",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(skips.statusCode).toBe(200);
    expect(
      skips.json().items.some(
        (row: { marketTicker: string; reasonRaw: string }) =>
          row.marketTicker === "KXBTCD-SKIP-ONLY" &&
          row.reasonRaw.includes("cooldown")
      )
    ).toBe(true);
    expect(
      skips.json().items.some((row: { reasonRaw: string }) => row.reasonRaw.includes("no side passed gate"))
    ).toBe(true);

    expect(pnl.statusCode).toBe(200);
    expect(pnl.json().strategyBreakdown.length).toBeGreaterThan(0);
    expect(pnl.json().portfolioSummary.disagreementCount).toBeGreaterThan(0);
    expect(skipExport.statusCode).toBe(200);
    expect(skipExport.body).toContain("KXBTCD-SKIP-ONLY");
    expect(pnlExport.statusCode).toBe(200);
    expect(pnlExport.body).toContain("portfolio_summary");
    expect(pnlExport.body).toContain("compare_summary");
  });

  test("emit live skip upserts that converge with persisted skip history", async () => {
    await seedAnalyticsFacts();

    const stream = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=skips",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(stream.statusCode).toBe(200);
    expect(stream.body).toContain("event: skip.upsert");

    const streamPayload = stream.body
      .split("\n")
      .find((line) => line.startsWith("data: "));
    expect(streamPayload).toBeDefined();
    const event = skipUpsertEventSchema.parse(
      JSON.parse(String(streamPayload).slice(6)) as unknown
    );

    const skips = await app.inject({
      method: "GET",
      url: `/api/skips?page=1&pageSize=50&range=all-time&timezone=utc&search=${encodeURIComponent(event.payload.correlationId)}`,
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(skips.statusCode).toBe(200);
    expect(
      skips.json().items.some(
        (row: { correlationId: string; occurredAt: string }) =>
          row.correlationId === event.payload.row.correlationId &&
          row.occurredAt === event.payload.row.occurredAt
      )
    ).toBe(true);
  });
});
