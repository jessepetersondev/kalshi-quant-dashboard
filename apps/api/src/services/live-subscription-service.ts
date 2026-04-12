import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import {
  liveSubscriptionAuthorizationSchema,
  type EffectiveCapability,
  type LiveSubscriptionRequest
} from "@kalshi-quant-dashboard/contracts";

const implementedChannels = new Set([
  "overview",
  "decisions",
  "trades",
  "skips",
  "pnl",
  "operations",
  "alerts"
]);

export class LiveSubscriptionService {
  authorize(args: {
    readonly effectiveCapability: EffectiveCapability;
    readonly request: LiveSubscriptionRequest;
  }) {
    const requestedStrategies = [
      ...(args.request.strategy ?? []),
      ...(args.request.compare ?? [])
    ];

    if (
      args.request.detailLevel === "debug" &&
      args.effectiveCapability.detailLevelMax !== "debug"
    ) {
      return liveSubscriptionAuthorizationSchema.parse({
        allowed: false,
        reason: "Debug detail is not allowed for this session.",
        filteredChannels: [],
        detailLevel: "standard"
      });
    }

    if (
      requestedStrategies.some(
        (strategyId) => !scopeAllows(args.effectiveCapability.strategyScope, strategyId)
      )
    ) {
      return liveSubscriptionAuthorizationSchema.parse({
        allowed: false,
        reason: "Requested strategy scope exceeds session capability.",
        filteredChannels: [],
        detailLevel: args.request.detailLevel
      });
    }

    return liveSubscriptionAuthorizationSchema.parse({
      allowed: true,
      filteredChannels: args.request.channels.filter((channel) => implementedChannels.has(channel)),
      detailLevel:
        args.request.detailLevel === "debug" &&
        args.effectiveCapability.detailLevelMax === "debug"
          ? "debug"
          : "standard"
    });
  }
}
