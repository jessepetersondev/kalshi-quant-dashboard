import { describe, expect, test } from "vitest";

import { resolveLifecycleRange } from "../../../apps/web/src/features/router/queryState.js";

describe("resolveLifecycleRange", () => {
  test("defaults lifecycle pages to 24h when no override is provided", () => {
    expect(resolveLifecycleRange(new URLSearchParams())).toBe("24h");
  });

  test("allows trades page to opt into all-time when no explicit range is present", () => {
    expect(resolveLifecycleRange(new URLSearchParams(), "all-time")).toBe("all-time");
  });

  test("preserves an explicit range from the URL over the page default", () => {
    expect(resolveLifecycleRange(new URLSearchParams("range=7d"), "all-time")).toBe("7d");
  });
});
