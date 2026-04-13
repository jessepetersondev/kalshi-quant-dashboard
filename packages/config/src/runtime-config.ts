import { loadEnv, type DashboardEnv } from "./env.js";

export interface StrategyEndpointConfig {
  readonly strategyId: "btc" | "eth" | "sol" | "xrp";
  readonly repoName: string;
  readonly symbol: "BTC" | "ETH" | "SOL" | "XRP";
  readonly baseUrl: string;
}

export interface RuntimeConfig {
  readonly env: DashboardEnv;
  readonly apiPort: number;
  readonly ingestPort: number;
  readonly webPort: number;
  readonly authMode: DashboardEnv["AUTH_MODE"];
  readonly publisherBaseUrl: string;
  readonly executorBaseUrl: string;
  readonly rabbitMqManagementUrl: string;
  readonly ingestPollIntervalMs: number;
  readonly ingestRuntime: {
    readonly enableStrategyCollectors: boolean;
    readonly enablePublisherCollector: boolean;
    readonly enableExecutorCollector: boolean;
    readonly enableRabbitMqManagementCollector: boolean;
    readonly enableRabbitMqConsumers: boolean;
    readonly enableSmokeHeartbeatRefresh: boolean;
  };
  readonly strategyEndpoints: readonly StrategyEndpointConfig[];
}

export function createRuntimeConfig(
  source: NodeJS.ProcessEnv = process.env
): RuntimeConfig {
  const env = loadEnv(source);

  return {
    env,
    apiPort: env.PORT_API,
    ingestPort: env.PORT_INGEST,
    webPort: env.WEB_PORT,
    authMode: env.AUTH_MODE,
    publisherBaseUrl: env.PUBLISHER_BASE_URL,
    executorBaseUrl: env.EXECUTOR_BASE_URL,
    rabbitMqManagementUrl: env.RABBITMQ_MANAGEMENT_URL,
    ingestPollIntervalMs: env.INGEST_POLL_INTERVAL_MS,
    ingestRuntime: {
      enableStrategyCollectors: env.INGEST_ENABLE_STRATEGY_COLLECTORS,
      enablePublisherCollector: env.INGEST_ENABLE_PUBLISHER_COLLECTOR,
      enableExecutorCollector: env.INGEST_ENABLE_EXECUTOR_COLLECTOR,
      enableRabbitMqManagementCollector: env.INGEST_ENABLE_RABBITMQ_MANAGEMENT_COLLECTOR,
      enableRabbitMqConsumers: env.INGEST_ENABLE_RABBITMQ_CONSUMERS,
      enableSmokeHeartbeatRefresh: env.INGEST_ENABLE_SMOKE_HEARTBEAT_REFRESH
    },
    strategyEndpoints: [
      {
        strategyId: "btc",
        repoName: "kalshi-btc-quant",
        symbol: "BTC",
        baseUrl: env.STRATEGY_BTC_BASE_URL
      },
      {
        strategyId: "eth",
        repoName: "kalshi-eth-quant",
        symbol: "ETH",
        baseUrl: env.STRATEGY_ETH_BASE_URL
      },
      {
        strategyId: "sol",
        repoName: "kalshi-sol-quant",
        symbol: "SOL",
        baseUrl: env.STRATEGY_SOL_BASE_URL
      },
      {
        strategyId: "xrp",
        repoName: "kalshi-xrp-quant",
        symbol: "XRP",
        baseUrl: env.STRATEGY_XRP_BASE_URL
      }
    ]
  };
}
