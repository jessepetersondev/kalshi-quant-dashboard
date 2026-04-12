import type { EffectiveCapability } from "@kalshi-quant-dashboard/contracts";

export interface DetailVisibilityResult {
  readonly rawPayloadAvailable: boolean;
  readonly includeRawPayloads: boolean;
  readonly includeDebugMetadata: boolean;
  readonly omissionReason: string | null;
}

export class DetailVisibilityService {
  resolve(args: {
    readonly effectiveCapability: EffectiveCapability;
    readonly detailLevel: "standard" | "debug";
  }): DetailVisibilityResult {
    const rawPayloadAvailable = args.effectiveCapability.canViewRawPayloads;
    const includeRawPayloads =
      rawPayloadAvailable && args.detailLevel === "debug";
    const includeDebugMetadata =
      args.effectiveCapability.detailLevelMax === "debug" &&
      args.detailLevel === "debug";

    return {
      rawPayloadAvailable,
      includeRawPayloads,
      includeDebugMetadata,
      omissionReason: rawPayloadAvailable ? null : "policy_denied"
    };
  }
}
