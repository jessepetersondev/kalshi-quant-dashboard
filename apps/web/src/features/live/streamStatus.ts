import type { StreamStatusEvent } from "@kalshi-quant-dashboard/contracts";

export function resolveStreamStatus(args: {
  readonly status: StreamStatusEvent["payload"] | null;
  readonly paused: boolean;
  readonly fallbackFreshnessTimestamp: string | null;
  readonly degraded?: boolean;
}): StreamStatusEvent["payload"] {
  if (args.status) {
    return args.paused
      ? {
          ...args.status,
          connectionState: "paused"
        }
      : args.status;
  }

  return {
    connectionState: args.paused ? "paused" : args.degraded ? "degraded" : "connected",
    freshnessTimestamp: args.fallbackFreshnessTimestamp ?? new Date().toISOString(),
    degraded: Boolean(args.degraded),
    reconciliationPending: false
  };
}
