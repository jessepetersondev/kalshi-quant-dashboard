import { describe, expect, test } from "vitest";

import { getSourcePathBadge } from "../../../apps/ingest/src/projections/strategy-summary-projector.js";

describe("strategy source-path badge", () => {
  test("return a direct collector badge", () => {
    expect(getSourcePathBadge("direct_only")).toEqual({
      label: "Direct",
      tone: "direct"
    });
  });

  test("return a hybrid collector badge", () => {
    expect(getSourcePathBadge("hybrid")).toEqual({
      label: "Hybrid",
      tone: "hybrid"
    });
  });

  test("return a centralized publisher badge", () => {
    expect(getSourcePathBadge("publisher_only")).toEqual({
      label: "Publisher",
      tone: "publisher"
    });
  });
});
