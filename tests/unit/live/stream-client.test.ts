import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { connectStream } from "../../../apps/web/src/features/live/streamClient.js";

class FakeEventSource {
  static lastInstance: FakeEventSource | null = null;

  readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();
  onerror?: () => void;

  constructor(
    readonly url: string,
    readonly init: { readonly withCredentials?: boolean }
  ) {
    FakeEventSource.lastInstance = this;
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  close() {
    return undefined;
  }

  emit(type: string, data: unknown) {
    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      listener({ data: JSON.stringify(data) } as MessageEvent<string>);
    }
  }
}

describe("stream client live handlers", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", FakeEventSource);
    FakeEventSource.lastInstance = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("register skip, gap, and resync listeners against the shared schemas", () => {
    const onSkipUpsert = vi.fn();
    const onGap = vi.fn();
    const onResyncRequired = vi.fn();

    const disconnect = connectStream(
      {
        channels: ["skips", "alerts"],
        timezone: "utc",
        detailLevel: "standard",
        strategy: ["btc"],
        compare: ["btc", "eth"]
      },
      {
        onSkipUpsert,
        onGap,
        onResyncRequired
      }
    );

    const stream = FakeEventSource.lastInstance;
    expect(stream?.url).toContain("channels=skips%2Calerts");
    expect(stream?.url).toContain("strategy=btc");
    expect(stream?.url).toContain("compare=btc%2Ceth");

    stream?.emit("skip.upsert", {
      projectionChangeId: 12,
      channel: "skips",
      kind: "upsert",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:15:05Z",
      effectiveOccurredAt: "2026-04-11T12:15:00Z",
      payload: {
        correlationId: "corr-btc-skip",
        row: {
          correlationId: "corr-btc-skip",
          strategyId: "btc",
          symbol: "BTC",
          marketTicker: "KXBTCD-SKIP-ONLY",
          skipCategory: "timing_window",
          skipCode: "cooldown_active",
          reasonRaw: "cooldown after recent fill",
          occurredAt: "2026-04-11T12:15:00Z"
        }
      }
    });
    stream?.emit("stream.gap", {
      projectionChangeId: 0,
      channel: "overview",
      kind: "gap",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:15:05Z",
      effectiveOccurredAt: "2026-04-11T12:15:00Z",
      payload: {
        gapType: "history_mismatch",
        affectedChannels: ["skips"],
        detectedAt: "2026-04-11T12:15:00Z",
        message: "Skip stream mismatch requires refetch."
      }
    });
    stream?.emit("stream.resync_required", {
      projectionChangeId: 99,
      channel: "overview",
      kind: "resync_required",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:15:05Z",
      effectiveOccurredAt: null,
      payload: {
        reason: "Cursor too old.",
        affectedChannels: ["alerts"],
        refetch: true,
        cursorStart: 14
      }
    });

    expect(onSkipUpsert).toHaveBeenCalledTimes(1);
    expect(onGap).toHaveBeenCalledTimes(1);
    expect(onResyncRequired).toHaveBeenCalledTimes(1);

    disconnect();
  });
});
