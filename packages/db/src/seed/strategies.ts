import type { PoolClient } from "pg";

export interface SeedStrategy {
  readonly strategyId: "btc" | "eth" | "sol" | "xrp";
  readonly displayName: string;
  readonly repoName: string;
  readonly symbol: string;
  readonly sourcePathMode: "hybrid" | "direct_only";
  readonly baseUrl: string;
  readonly dashboardLivePath?: string;
  readonly skipDiagnosticsPath?: string;
}

export const seedStrategies: readonly SeedStrategy[] = [
  {
    strategyId: "btc",
    displayName: "BTC Strategy",
    repoName: "kalshi-btc-quant",
    symbol: "BTC",
    sourcePathMode: "hybrid",
    baseUrl: "http://localhost:8101",
    dashboardLivePath: "/api/dashboard/live"
  },
  {
    strategyId: "eth",
    displayName: "ETH Strategy",
    repoName: "kalshi-eth-quant",
    symbol: "ETH",
    sourcePathMode: "direct_only",
    baseUrl: "http://localhost:8102"
  },
  {
    strategyId: "sol",
    displayName: "SOL Strategy",
    repoName: "kalshi-sol-quant",
    symbol: "SOL",
    sourcePathMode: "direct_only",
    baseUrl: "http://localhost:8103",
    skipDiagnosticsPath: "/api/no-trade-diagnostics"
  },
  {
    strategyId: "xrp",
    displayName: "XRP Strategy",
    repoName: "kalshi-xrp-quant",
    symbol: "XRP",
    sourcePathMode: "direct_only",
    baseUrl: "http://localhost:8104"
  }
];

export async function seedStrategiesTable(client: PoolClient): Promise<void> {
  for (const strategy of seedStrategies) {
    await client.query(
      `
        insert into strategies (
          strategy_id,
          display_name,
          repo_name,
          symbol,
          enabled,
          seeded_initial_strategy,
          source_path_mode,
          health_status
        )
        values ($1, $2, $3, $4, true, true, $5, 'unknown')
        on conflict (strategy_id) do update
        set display_name = excluded.display_name,
            repo_name = excluded.repo_name,
            symbol = excluded.symbol,
            source_path_mode = excluded.source_path_mode,
            updated_at = now()
      `,
      [
        strategy.strategyId,
        strategy.displayName,
        strategy.repoName,
        strategy.symbol,
        strategy.sourcePathMode
      ]
    );
  }
}
