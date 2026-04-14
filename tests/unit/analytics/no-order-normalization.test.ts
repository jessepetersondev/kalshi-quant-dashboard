import { describe, expect, test } from "vitest";

import { loadFixture } from "@kalshi-quant-dashboard/testing";

import { normalizeNoOrderDiagnosticPayload } from "../../../apps/ingest/src/normalization/no-order-normalizer.js";

describe("no-order diagnostic normalization", () => {
  test("promotes no-trade diagnostics into first-class skip facts", async () => {
    const payload = await loadFixture<Record<string, unknown>>("skips/no-order.json");
    const normalized = normalizeNoOrderDiagnosticPayload(payload);

    expect(normalized).toMatchObject({
      skipKind: "no_trade_diagnostic",
      skipCategory: "data_quality",
      skipCode: "insufficient_signal",
      reasonRaw: "no side passed gate"
    });
  });

  test("fall back to top reasons and default text when no global reason is present", () => {
    expect(
      normalizeNoOrderDiagnosticPayload({
        top_reasons: [{ reason: "queue unavailable" }]
      })
    ).toMatchObject({
      reasonRaw: "queue unavailable",
      skipCategory: "infrastructure"
    });

    expect(normalizeNoOrderDiagnosticPayload({})).toMatchObject({
      reasonRaw: "no trade diagnostic",
      skipCategory: "other"
    });
  });
});
