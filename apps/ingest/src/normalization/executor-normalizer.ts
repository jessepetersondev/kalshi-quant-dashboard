import { sourceProfiles, type SourceObservationInput } from "@kalshi-quant-dashboard/source-adapters";

import { normalizeObservation } from "./normalize-observation.js";

export function normalizeExecutorResult(input: Omit<SourceObservationInput, "sourceProfile">) {
  return normalizeObservation({
    ...input,
    sourceProfile: sourceProfiles.standaloneExecutorV1
  });
}
