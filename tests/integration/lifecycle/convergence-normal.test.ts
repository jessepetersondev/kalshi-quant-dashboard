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

describe.sequential("lifecycle convergence normal flow", () => {
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

  test("serve searchable decision and trade lifecycles with detail timelines", async () => {
    await seedLifecycleFacts();

    const decisionsResponse = await app.inject({
      method: "GET",
      url: `/api/decisions?search=${encodeURIComponent(ETH_DECISION_ID)}`,
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const tradesResponse = await app.inject({
      method: "GET",
      url: "/api/trades?search=publisher-order-1",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });

    expect(decisionsResponse.statusCode).toBe(200);
    expect(tradesResponse.statusCode).toBe(200);

    const decisionList = decisionListResponseSchema.parse(decisionsResponse.json());
    const tradeList = tradeListResponseSchema.parse(tradesResponse.json());
    expect(decisionList.items[0]?.correlationId).toBe(ETH_DECISION_ID);
    expect(tradeList.items[0]?.tradeAttemptKey).toBe("publisher-order-1");

    const decisionDetailResponse = await app.inject({
      method: "GET",
      url: `/api/decisions/${encodeURIComponent(ETH_DECISION_ID)}`,
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const tradeDetailResponse = await app.inject({
      method: "GET",
      url: "/api/trades/corr-btc-1",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });

    expect(decisionDetailResponse.statusCode).toBe(200);
    expect(tradeDetailResponse.statusCode).toBe(200);

    const decisionDetail = decisionDetailResponseSchema.parse(decisionDetailResponse.json());
    const tradeDetail = tradeDetailResponseSchema.parse(tradeDetailResponse.json());
    expect(decisionDetail.timeline.length).toBeGreaterThanOrEqual(1);
    expect(decisionDetail.summary.sourcePathMode).toBe("direct_only");
    expect(tradeDetail.timeline.length).toBeGreaterThanOrEqual(2);
    expect(tradeDetail.summary.lastResultStatus).toBe("accepted");
  });
});
