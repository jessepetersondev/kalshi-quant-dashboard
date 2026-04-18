import { describe, expect, test } from "vitest";

import { loadEnv } from "@kalshi-quant-dashboard/config";
import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";
import { getServerSecrets } from "@kalshi-quant-dashboard/config";

describe("runtime config", () => {
  test("load defaults and boolean coercions from env", () => {
    const env = loadEnv({
      INGEST_ENABLE_STRATEGY_COLLECTORS: "false",
      INGEST_ENABLE_SMOKE_HEARTBEAT_REFRESH: "true",
      PORT_API: "4100"
    });

    expect(env.PORT_API).toBe(4100);
    expect(env.INGEST_ENABLE_STRATEGY_COLLECTORS).toBe(false);
    expect(env.INGEST_ENABLE_SMOKE_HEARTBEAT_REFRESH).toBe(true);
    expect(env.DATABASE_URL).toContain("kalshi_quant_dashboard");
    expect(env.AUTH_MODE).toBe("dev");
  });

  test("map runtime config and expose seeded strategy endpoints", () => {
    const config = createRuntimeConfig({
      AUTH_MODE: "oidc",
      STRATEGY_BTC_BASE_URL: "http://btc.test",
      STRATEGY_ETH_BASE_URL: "http://eth.test",
      STRATEGY_SOL_BASE_URL: "http://sol.test",
      STRATEGY_XRP_BASE_URL: "http://xrp.test",
      INGEST_ENABLE_RABBITMQ_CONSUMERS: "false",
      INGEST_ENABLED_STRATEGIES: "btc, sol"
    });

    expect(config.authMode).toBe("oidc");
    expect(config.ingestRuntime.enableRabbitMqConsumers).toBe(false);
    expect(config.ingestRuntime.enabledStrategies).toEqual(["btc", "sol"]);
    expect(config.strategyEndpoints).toEqual([
      {
        strategyId: "btc",
        repoName: "kalshi-btc-quant",
        symbol: "BTC",
        baseUrl: "http://btc.test"
      },
      {
        strategyId: "eth",
        repoName: "kalshi-eth-quant",
        symbol: "ETH",
        baseUrl: "http://eth.test"
      },
      {
        strategyId: "sol",
        repoName: "kalshi-sol-quant",
        symbol: "SOL",
        baseUrl: "http://sol.test"
      },
      {
        strategyId: "xrp",
        repoName: "kalshi-xrp-quant",
        symbol: "XRP",
        baseUrl: "http://xrp.test"
      }
    ]);
  });

  test("return server-only secrets and reject invalid env", () => {
    const boundary = getServerSecrets({
      DATABASE_URL: "postgres://test",
      RABBITMQ_URL: "amqp://test",
      SESSION_COOKIE_SECRET: "secret"
    });

    expect(boundary.browserSafe).toBe(false);
    expect(boundary.secrets).toEqual({
      databaseUrl: "postgres://test",
      rabbitMqUrl: "amqp://test",
      sessionCookieSecret: "secret"
    });

    expect(() =>
      loadEnv({
        DATABASE_URL: "   "
      })
    ).toThrow();
  });
});
