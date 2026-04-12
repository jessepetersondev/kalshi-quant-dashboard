import { describe, expect, test } from "vitest";

import {
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
});
