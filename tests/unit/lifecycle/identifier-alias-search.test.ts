import { describe, expect, test } from "vitest";

import type {
  DecisionRow,
  TradeRow
} from "@kalshi-quant-dashboard/contracts";

import {
  buildLifecycleSearchIndex,
  matchesIdentifierSearch,
  selectRawPayloadViewState
} from "../../../apps/web/src/features/lifecycle/selectors.js";

describe("lifecycle search and visibility selectors", () => {
  test("match identifier aliases and summary fields with one search index", () => {
    const decisionRow: DecisionRow = {
      correlationId: "corr-btc-1",
      strategyId: "btc",
      symbol: "BTC",
      marketTicker: "KXBTCD-TEST",
      decisionAction: "buy_yes",
      reasonSummary: "momentum entry",
      currentLifecycleStage: "strategy_emission",
      currentOutcomeStatus: "emitted",
      latestEventAt: "2026-04-11T12:00:00Z",
      sourcePathMode: "hybrid",
      degraded: false
    };
    const tradeRow: TradeRow = {
      correlationId: "corr-btc-1",
      tradeAttemptKey: "publisher-order-1",
      strategyId: "btc",
      symbol: "BTC",
      marketTicker: "KXBTCD-TEST",
      status: "accepted",
      publishStatus: "published",
      lastResultStatus: "accepted",
      latestSeenAt: "2026-04-11T12:00:03Z",
      sourcePathMode: "hybrid",
      degraded: false
    };
    const index = buildLifecycleSearchIndex(decisionRow, tradeRow, [
      "publisher-order-1",
      "client-order-1",
      "external-order-1",
      "trade-intent-1"
    ]);

    expect(matchesIdentifierSearch(index, "external-order-1")).toBe(true);
    expect(matchesIdentifierSearch(index, "momentum")).toBe(true);
    expect(matchesIdentifierSearch(index, "missing-value")).toBe(false);
  });

  test("derive raw-payload panel state from capability and detail response", () => {
    expect(
      selectRawPayloadViewState({
        canViewRawPayloads: false,
        rawPayloadAvailable: false
      })
    ).toEqual({
      canShowPanel: false,
      showOmissionNotice: true
    });

    expect(
      selectRawPayloadViewState({
        canViewRawPayloads: true,
        rawPayloadAvailable: true
      })
    ).toEqual({
      canShowPanel: true,
      showOmissionNotice: false
    });
  });
});
