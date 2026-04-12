import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";
import {
  decisionDetailResponseSchema,
  decisionListResponseSchema,
  tradeDetailResponseSchema,
  tradeListResponseSchema
} from "@kalshi-quant-dashboard/contracts";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedLifecycleFacts } from "./helpers.js";

const ETH_DECISION_ID = "kalshi-eth-quant:KXETHD-TEST:2026-04-11T12:00:00Z";

describe.sequential("lifecycle deep-link parity", () => {
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

  test("return the same summary row through list and detail surfaces", async () => {
    await seedLifecycleFacts();

    const decisionsResponse = await app.inject({
      method: "GET",
      url: `/api/decisions?search=${encodeURIComponent(ETH_DECISION_ID)}`,
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });
    const tradesResponse = await app.inject({
      method: "GET",
      url: "/api/trades?search=publisher-order-1",
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });

    const decisionList = decisionListResponseSchema.parse(decisionsResponse.json());
    const tradeList = tradeListResponseSchema.parse(tradesResponse.json());

    const decisionDetailResponse = await app.inject({
      method: "GET",
      url: `/api/decisions/${decisionList.items[0]?.correlationId}`,
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });
    const tradeDetailResponse = await app.inject({
      method: "GET",
      url: `/api/trades/${tradeList.items[0]?.correlationId}`,
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });

    const decisionDetail = decisionDetailResponseSchema.parse(decisionDetailResponse.json());
    const tradeDetail = tradeDetailResponseSchema.parse(tradeDetailResponse.json());

    expect(decisionDetail.summary).toMatchObject(decisionList.items[0]!);
    expect(tradeDetail.summary).toMatchObject(tradeList.items[0]!);
  });
});
