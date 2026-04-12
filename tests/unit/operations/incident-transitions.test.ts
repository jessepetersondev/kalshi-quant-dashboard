import { describe, expect, test } from "vitest";

import { resolveAlertTransition } from "../../../apps/ingest/src/projections/alert-projector.js";

describe("incident transitions", () => {
  test("marks resolved incidents with a resolved timestamp", () => {
    const transition = resolveAlertTransition({
      previousStatus: "open",
      nextStatus: "resolved",
      seenAt: "2026-04-11T12:05:00Z"
    });

    expect(transition.status).toBe("resolved");
    expect(transition.resolvedAt).toBe("2026-04-11T12:05:00Z");
    expect(transition.reopened).toBe(false);
  });

  test("clears resolved timestamps when a resolved incident is reopened", () => {
    const transition = resolveAlertTransition({
      previousStatus: "resolved",
      nextStatus: "open",
      seenAt: "2026-04-11T12:06:00Z"
    });

    expect(transition.status).toBe("open");
    expect(transition.resolvedAt).toBeNull();
    expect(transition.reopened).toBe(true);
  });
});
