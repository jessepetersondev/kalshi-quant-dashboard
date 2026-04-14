import { describe, expect, test } from "vitest";

import { createPauseBuffer } from "../../../apps/web/src/features/live/pauseBuffer.js";
import { resolveStreamStatus } from "../../../apps/web/src/features/live/streamStatus.js";

describe("pause buffer and stream status", () => {
  test("buffer events only while paused and flush them on resume", () => {
    const buffer = createPauseBuffer<number>();

    buffer.push(1);
    expect(buffer.buffered).toEqual([]);

    buffer.pause();
    buffer.push(2);
    buffer.push(3);

    expect(buffer.isPaused).toBe(true);
    expect(buffer.buffered).toEqual([2, 3]);
    expect(buffer.flush()).toEqual([2, 3]);
    expect(buffer.buffered).toEqual([]);

    buffer.push(4);
    expect(buffer.buffered).toEqual([4]);
    expect(buffer.resume()).toEqual([4]);
    expect(buffer.isPaused).toBe(false);
    expect(buffer.buffered).toEqual([]);
  });

  test("derive stream status from explicit status, paused state, and degraded fallback", () => {
    expect(
      resolveStreamStatus({
        status: {
          connectionState: "connected",
          freshnessTimestamp: "2026-04-13T20:00:00.000Z",
          degraded: false,
          reconciliationPending: false
        },
        paused: true,
        fallbackFreshnessTimestamp: null
      })
    ).toMatchObject({
      connectionState: "paused",
      freshnessTimestamp: "2026-04-13T20:00:00.000Z"
    });

    expect(
      resolveStreamStatus({
        status: null,
        paused: false,
        fallbackFreshnessTimestamp: "2026-04-13T20:10:00.000Z",
        degraded: true
      })
    ).toEqual({
      connectionState: "degraded",
      freshnessTimestamp: "2026-04-13T20:10:00.000Z",
      degraded: true,
      reconciliationPending: false
    });

    expect(
      resolveStreamStatus({
        status: {
          connectionState: "connected",
          freshnessTimestamp: "2026-04-13T20:15:00.000Z",
          degraded: false,
          reconciliationPending: true
        },
        paused: false,
        fallbackFreshnessTimestamp: null
      })
    ).toMatchObject({
      connectionState: "connected",
      reconciliationPending: true
    });

    const fallback = resolveStreamStatus({
      status: null,
      paused: false,
      fallbackFreshnessTimestamp: null,
      degraded: false
    });
    expect(fallback.connectionState).toBe("connected");
    expect(fallback.degraded).toBe(false);
    expect(typeof fallback.freshnessTimestamp).toBe("string");
  });
});
