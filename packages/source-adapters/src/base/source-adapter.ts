import type { SourceProfile } from "../compatibility/source-profiles.js";

export interface SourceObservationInput {
  readonly sourceProfile: SourceProfile;
  readonly sourceRepo: string;
  readonly strategyId?: string;
  readonly replayKind?: "live" | "redelivery" | "replay" | "backfill" | "resync";
  readonly payload: unknown;
  readonly metadata?: Record<string, unknown>;
}

export interface SourceAdapter {
  readonly variant: string;
  canHandle(variant: string): boolean;
  observe(input: SourceObservationInput): Promise<unknown>;
}
