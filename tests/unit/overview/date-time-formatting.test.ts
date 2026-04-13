import { describe, expect, test } from "vitest";

import {
  DISPLAY_TIMEZONE_LABEL,
  formatTimestamp,
  fromCentralDateTimeInput,
  toCentralDateTimeInput
} from "../../../apps/web/src/features/format/dateTime.js";

describe("date time formatting", () => {
  test("renders timestamps in fixed CST", () => {
    expect(formatTimestamp("2026-04-13T18:30:00Z", "utc")).toBe(
      `4/13/2026, 12:30:00 PM ${DISPLAY_TIMEZONE_LABEL}`
    );
    expect(formatTimestamp("2026-04-13T18:30:00Z", "local")).toBe(
      `4/13/2026, 12:30:00 PM ${DISPLAY_TIMEZONE_LABEL}`
    );
  });

  test("round trips custom datetime inputs through CST", () => {
    expect(toCentralDateTimeInput("2026-04-13T18:30:00.000Z")).toBe("2026-04-13T12:30");
    expect(fromCentralDateTimeInput("2026-04-13T12:30")).toBe("2026-04-13T18:30:00.000Z");
    expect(fromCentralDateTimeInput("")).toBeUndefined();
  });
});
