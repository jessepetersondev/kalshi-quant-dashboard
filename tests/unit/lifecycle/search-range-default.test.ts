import { describe, expect, test } from "vitest";

import { DecisionService } from "../../../apps/api/src/services/decision-service.js";
import { TradeService } from "../../../apps/api/src/services/trade-service.js";

describe("search range defaults", () => {
  test("expand decision search without an explicit range to all-time", () => {
    const service = new DecisionService();

    const parsed = service.parseListQuery({
      search: "kalshi-eth-quant:KXETHD-TEST:2026-04-11T12:00:00Z"
    });

    expect(parsed.range).toBe("all-time");
  });

  test("preserve explicit decision range values", () => {
    const service = new DecisionService();

    const parsed = service.parseListQuery({
      search: "corr-btc-1",
      range: "24h"
    });

    expect(parsed.range).toBe("24h");
  });

  test("expand trade search without an explicit range to all-time", () => {
    const service = new TradeService();

    const parsed = service.parseListQuery({
      search: "publisher-order-1"
    });

    expect(parsed.range).toBe("all-time");
  });

  test("preserve explicit trade range values", () => {
    const service = new TradeService();

    const parsed = service.parseListQuery({
      search: "publisher-order-1",
      range: "7d"
    });

    expect(parsed.range).toBe("7d");
  });
});
