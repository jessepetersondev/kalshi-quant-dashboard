import type { SourceProfileKey } from "../compatibility/source-profiles.js";
import type { StrategyDefinition } from "./strategy-registry.js";

export interface SourceBinding {
  readonly sourceBindingId: string;
  readonly strategyId?: string;
  readonly sourceProfileKey: SourceProfileKey;
  readonly priority: number;
  readonly usedFor: readonly (
    | "decisions"
    | "trades"
    | "skips"
    | "positions"
    | "pnl"
    | "heartbeats"
    | "operations"
  )[];
}

export function resolveSourceBindingsForPurpose(
  bindings: readonly SourceBinding[],
  strategy: StrategyDefinition | undefined,
  purpose: SourceBinding["usedFor"][number]
): readonly SourceBinding[] {
  return bindings
    .filter((binding) => binding.usedFor.includes(purpose))
    .filter((binding) =>
      strategy ? !binding.strategyId || binding.strategyId === strategy.strategyId : true
    )
    .sort((left, right) => left.priority - right.priority);
}
