import {
  loadSeededStrategyRegistry,
  sourceProfiles,
  type StrategyDefinition
} from "@kalshi-quant-dashboard/source-adapters";

interface SmokeHeartbeatIngest {
  ingest(input: {
    readonly sourceProfile: (typeof sourceProfiles)["quantHealthV1"];
    readonly sourceRepo: string;
    readonly strategyId: string;
    readonly payload: Record<string, unknown>;
  }): Promise<unknown>;
}

function createHeartbeatPayload(strategy: StrategyDefinition, occurredAt: string): Record<string, unknown> {
  return {
    status: "ok",
    asset: strategy.symbol,
    mode: "live",
    halted: false,
    halt_reason: null,
    last_scan_at: occurredAt,
    live_execution_configured: true,
    config_warnings: []
  };
}

export class SmokeHeartbeatRefresher {
  constructor(
    private readonly ingestService: SmokeHeartbeatIngest,
    private readonly strategies: readonly StrategyDefinition[] = loadSeededStrategyRegistry().list()
  ) {}

  async refresh(nowIso: string = new Date().toISOString()): Promise<void> {
    await Promise.all(
      this.strategies.map((strategy) =>
        this.ingestService.ingest({
          sourceProfile: sourceProfiles.quantHealthV1,
          sourceRepo: strategy.repoName,
          strategyId: strategy.strategyId,
          payload: createHeartbeatPayload(strategy, nowIso)
        })
      )
    );
  }
}
