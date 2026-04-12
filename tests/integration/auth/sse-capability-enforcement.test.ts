import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  alertUpsertEventSchema,
  decisionUpsertEventSchema,
  pnlUpsertEventSchema,
  skipUpsertEventSchema,
  tradeUpsertEventSchema
} from "@kalshi-quant-dashboard/contracts";
import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { upsertProjectedAlert } from "../../../apps/ingest/src/projections/alert-projector.js";
import { seedLifecycleFacts } from "../lifecycle/helpers.js";
import { seedAnalyticsFacts } from "../../support/phase6.js";

function parseSseEvents(body: string): Array<{ name: string; data: unknown }> {
  return body
    .split("\n\n")
    .map((block) => {
      const eventLine = block
        .split("\n")
        .find((line) => line.startsWith("event: "));
      const dataLine = block
        .split("\n")
        .find((line) => line.startsWith("data: "));

      if (!eventLine || !dataLine) {
        return null;
      }

      return {
        name: eventLine.slice("event: ".length),
        data: JSON.parse(dataLine.slice("data: ".length)) as unknown
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
}

describe.sequential("SSE capability enforcement", () => {
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

  test("denies operator debug subscriptions and re-evaluates developer policy changes", async () => {
    const operator = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=overview&detailLevel=debug",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(operator.statusCode).toBe(403);

    const createPolicy = await app.inject({
      method: "POST",
      url: "/api/admin/access-policies",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        policy: {
          subjectType: "user",
          subjectKey: "user-developer",
          name: "Developer debug deny",
          precedence: 200,
          enabled: true
        },
        rules: [
          {
            ruleType: "debug_stream",
            effect: "deny",
            enabled: true
          }
        ],
        exportGrants: []
      }
    });

    expect(createPolicy.statusCode).toBe(201);

    const developer = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=overview&detailLevel=debug",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });

    expect(developer.statusCode).toBe(403);
  });

  test("applies requested strategy filters across live decision, trade, skip, alert, and pnl events", async () => {
    await seedLifecycleFacts();
    await seedAnalyticsFacts();
    await upsertProjectedAlert({
      alertId: "alert-btc-stream-filter",
      correlationId: "btc:alert:stream-filter",
      strategyId: "btc",
      alertType: "missing_heartbeat",
      severity: "warning",
      status: "open",
      summary: "BTC heartbeat delayed",
      detail: "BTC strategy heartbeat has not advanced in the expected window.",
      affectedComponent: "btc",
      metadata: { source: "integration-test" },
      seenAt: "2026-04-11T12:30:00Z"
    });
    await upsertProjectedAlert({
      alertId: "alert-eth-stream-filter",
      correlationId: "eth:alert:stream-filter",
      strategyId: "eth",
      alertType: "missing_heartbeat",
      severity: "warning",
      status: "open",
      summary: "ETH heartbeat delayed",
      detail: "ETH strategy heartbeat has not advanced in the expected window.",
      affectedComponent: "eth",
      metadata: { source: "integration-test" },
      seenAt: "2026-04-11T12:31:00Z"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=decisions,trades,skips,alerts,pnl&strategy=btc",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });

    expect(response.statusCode).toBe(200);
    const events = parseSseEvents(response.body);
    const decisionEvents = events
      .filter((event) => event.name === "decision.upsert")
      .map((event) => decisionUpsertEventSchema.parse(event.data));
    const tradeEvents = events
      .filter((event) => event.name === "trade.upsert")
      .map((event) => tradeUpsertEventSchema.parse(event.data));
    const skipEvents = events
      .filter((event) => event.name === "skip.upsert")
      .map((event) => skipUpsertEventSchema.parse(event.data));
    const alertEvents = events
      .filter((event) => event.name === "alert.upsert")
      .map((event) => alertUpsertEventSchema.parse(event.data));
    const pnlEvents = events
      .filter((event) => event.name === "pnl.upsert")
      .map((event) => pnlUpsertEventSchema.parse(event.data));

    expect(decisionEvents.length).toBeGreaterThan(0);
    expect(tradeEvents.length).toBeGreaterThan(0);
    expect(skipEvents.length).toBeGreaterThan(0);
    expect(alertEvents.length).toBeGreaterThan(0);
    expect(pnlEvents.length).toBeGreaterThan(0);

    expect(decisionEvents.every((event) => event.payload.row.strategyId === "btc")).toBe(true);
    expect(tradeEvents.every((event) => event.payload.row.strategyId === "btc")).toBe(true);
    expect(skipEvents.every((event) => event.payload.row.strategyId === "btc")).toBe(true);
    expect(
      alertEvents.every(
        (event) =>
          event.payload.row.componentType === "strategy" &&
          event.payload.row.componentKey === "btc"
      )
    ).toBe(true);
    expect(
      pnlEvents.every(
        (event) =>
          event.payload.scopeKey === "btc" && event.payload.summary.scopeKey === "btc"
      )
    ).toBe(true);
  });

  test("enforces strategy and compare filter requests against effective capability", async () => {
    await seedLifecycleFacts();
    await seedAnalyticsFacts();

    const createPolicy = await app.inject({
      method: "POST",
      url: "/api/admin/access-policies",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        policy: {
          subjectType: "user",
          subjectKey: "user-developer",
          name: "Developer BTC-only streams",
          precedence: 250,
          enabled: true
        },
        rules: [
          {
            ruleType: "strategy_scope",
            effect: "deny",
            strategyScope: ["eth", "sol", "xrp"],
            enabled: true
          }
        ],
        exportGrants: []
      }
    });

    expect(createPolicy.statusCode).toBe(201);

    const deniedStrategy = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=decisions&strategy=eth",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });
    const deniedCompare = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=pnl&compare=btc,eth",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });
    const allowedCompare = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=pnl&compare=btc",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });

    expect(deniedStrategy.statusCode).toBe(403);
    expect(deniedCompare.statusCode).toBe(403);
    expect(allowedCompare.statusCode).toBe(200);

    const pnlEvents = parseSseEvents(allowedCompare.body)
      .filter((event) => event.name === "pnl.upsert")
      .map((event) => pnlUpsertEventSchema.parse(event.data));
    expect(pnlEvents.length).toBeGreaterThan(0);
    expect(
      pnlEvents.every(
        (event) =>
          event.payload.scopeKey === "btc" && event.payload.summary.scopeKey === "btc"
      )
    ).toBe(true);
  });
});
