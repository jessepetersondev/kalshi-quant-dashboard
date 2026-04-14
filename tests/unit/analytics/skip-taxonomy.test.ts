import { describe, expect, test } from "vitest";

import {
  normalizeDashboardSkipRow,
  normalizeRuntimeSkipDecision,
  normalizeSkipReason
} from "../../../apps/ingest/src/normalization/skip-normalizer.js";

describe("skip taxonomy normalization", () => {
  test("maps cooldown skips into the timing-window taxonomy", () => {
    expect(normalizeSkipReason("cooldown after recent fill")).toMatchObject({
      skipCategory: "timing_window",
      skipCode: "cooldown_active"
    });
  });

  test("maps open-order skips into the position-state taxonomy", () => {
    const normalized = normalizeRuntimeSkipDecision({
      marketTicker: "KXETHD-SKIP",
      reason: "open live order already pending"
    });

    expect(normalized).toMatchObject({
      skipCategory: "position_state",
      skipCode: "existing_position_or_order"
    });
  });

  test("cover remaining taxonomy branches and fallback payloads", () => {
    expect(normalizeSkipReason("risk guardrail limit reached")).toMatchObject({
      skipCategory: "risk_guardrail",
      skipCode: "risk_limit"
    });
    expect(normalizeSkipReason("expiry window closed")).toMatchObject({
      skipCategory: "timing_window",
      skipCode: "expiry_window"
    });
    expect(normalizeSkipReason("strategy disabled by config")).toMatchObject({
      skipCategory: "configuration",
      skipCode: "strategy_configuration"
    });
    expect(normalizeSkipReason("rabbit queue unavailable")).toMatchObject({
      skipCategory: "infrastructure",
      skipCode: "pipeline_unavailable"
    });
    expect(normalizeSkipReason("stale quote, missing data")).toMatchObject({
      skipCategory: "data_quality",
      skipCode: "insufficient_signal"
    });
    expect(normalizeSkipReason("operator override requested")).toMatchObject({
      skipCategory: "operator_control",
      skipCode: "operator_override"
    });
    expect(normalizeSkipReason("spread and market liquidity too wide")).toMatchObject({
      skipCategory: "market_conditions",
      skipCode: "market_gate"
    });
    expect(normalizeSkipReason("completely unclassified")).toMatchObject({
      skipCategory: "other",
      skipCode: null
    });

    expect(normalizeRuntimeSkipDecision({ reasonRaw: "cooldown active" })).toMatchObject({
      reasonRaw: "cooldown active",
      skipCategory: "timing_window"
    });
    expect(normalizeDashboardSkipRow({})).toMatchObject({
      reasonRaw: "skip",
      skipCategory: "other"
    });
  });
});
