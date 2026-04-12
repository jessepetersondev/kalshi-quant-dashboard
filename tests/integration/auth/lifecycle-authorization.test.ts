import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";
import { decisionDetailResponseSchema } from "@kalshi-quant-dashboard/contracts";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedLifecycleFacts } from "../lifecycle/helpers.js";

const ETH_DECISION_ID = "kalshi-eth-quant:KXETHD-TEST:2026-04-11T12:00:00Z";

describe.sequential("lifecycle authorization", () => {
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

  test("enforce raw payload visibility and export resource scope by role", async () => {
    await seedLifecycleFacts();

    const operatorDetail = await app.inject({
      method: "GET",
      url: `/api/decisions/${encodeURIComponent(ETH_DECISION_ID)}`,
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const operatorDebug = await app.inject({
      method: "GET",
      url: `/api/decisions/${encodeURIComponent(ETH_DECISION_ID)}?detailLevel=debug`,
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const developerDebug = await app.inject({
      method: "GET",
      url: `/api/decisions/${encodeURIComponent(ETH_DECISION_ID)}?detailLevel=debug`,
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });
    const operatorTradesExport = await app.inject({
      method: "GET",
      url: "/api/exports/trades.csv?search=publisher-order-1",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const operatorDecisionsExport = await app.inject({
      method: "GET",
      url: `/api/exports/decisions.csv?search=${encodeURIComponent(ETH_DECISION_ID)}`,
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const developerTradesExport = await app.inject({
      method: "GET",
      url: "/api/exports/trades.csv?search=publisher-order-1",
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });

    expect(operatorDetail.statusCode).toBe(200);
    expect(decisionDetailResponseSchema.parse(operatorDetail.json()).rawPayloadAvailable).toBe(
      false
    );
    expect(operatorDebug.statusCode).toBe(403);
    expect(developerDebug.statusCode).toBe(200);
    expect(
      decisionDetailResponseSchema.parse(developerDebug.json()).rawPayloadAvailable
    ).toBe(true);
    expect(operatorTradesExport.statusCode).toBe(403);
    expect(operatorDecisionsExport.statusCode).toBe(200);
    expect(developerTradesExport.statusCode).toBe(200);
  });
});
