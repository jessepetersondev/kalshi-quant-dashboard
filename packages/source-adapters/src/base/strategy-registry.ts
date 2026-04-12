import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

export interface StrategyDefinition {
  readonly strategyId: string;
  readonly symbol: string;
  readonly repoName: string;
  readonly sourcePathMode: "publisher_only" | "direct_only" | "hybrid";
  readonly baseUrl: string;
  readonly healthPath: string;
  readonly statusPath: string;
  readonly positionsPath: string;
  readonly tradesPath: string;
  readonly ordersPath: string;
  readonly pnlPath: string;
  readonly realizedPnlPath: string;
  readonly skipDiagnosticsPath?: string;
  readonly dashboardLivePath?: string;
}

export class StrategyRegistry {
  constructor(private readonly definitions: readonly StrategyDefinition[]) {}

  list(): readonly StrategyDefinition[] {
    return this.definitions;
  }

  get(strategyId: string): StrategyDefinition | undefined {
    return this.definitions.find((definition) => definition.strategyId === strategyId);
  }
}

export function loadSeededStrategyRegistry(): StrategyRegistry {
  const config = createRuntimeConfig();

  return new StrategyRegistry(
    config.strategyEndpoints.map((endpoint) => {
      const definition: StrategyDefinition = {
        strategyId: endpoint.strategyId,
        symbol: endpoint.symbol,
        repoName: endpoint.repoName,
        sourcePathMode: endpoint.strategyId === "btc" ? "hybrid" : "direct_only",
        baseUrl: endpoint.baseUrl,
        healthPath: "/health",
        statusPath: "/api/status",
        positionsPath: "/api/positions",
        tradesPath: "/api/trades?limit=50",
        ordersPath: "/api/orders?limit=50",
        pnlPath: "/api/pnl",
        realizedPnlPath: "/api/pnl/realized"
      };

      if (endpoint.strategyId === "sol") {
        Object.assign(definition, {
          skipDiagnosticsPath: "/api/no-trade-diagnostics?reason_limit=5"
        });
      }

      if (endpoint.strategyId === "btc") {
        Object.assign(definition, {
          dashboardLivePath: "/api/dashboard/live"
        });
      }

      return definition;
    })
  );
}
