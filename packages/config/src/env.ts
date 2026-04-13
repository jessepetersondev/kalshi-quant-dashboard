import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const booleanish = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

export const authModeSchema = z.enum(["dev", "oidc", "proxy"]);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT_API: z.coerce.number().int().positive().default(3001),
    PORT_INGEST: z.coerce.number().int().positive().default(3002),
    WEB_PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: nonEmptyString.default(
      "postgres://postgres:postgres@localhost:5432/kalshi_quant_dashboard"
    ),
    RABBITMQ_URL: nonEmptyString.default("amqp://guest:guest@localhost:5672"),
    RABBITMQ_MANAGEMENT_URL: nonEmptyString.default(
      "http://guest:guest@localhost:15672/api"
    ),
    PUBLISHER_BASE_URL: nonEmptyString.default("http://localhost:5001"),
    EXECUTOR_BASE_URL: nonEmptyString.default("http://localhost:5002"),
    STRATEGY_BTC_BASE_URL: nonEmptyString.default("http://localhost:8101"),
    STRATEGY_ETH_BASE_URL: nonEmptyString.default("http://localhost:8102"),
    STRATEGY_SOL_BASE_URL: nonEmptyString.default("http://localhost:8103"),
    STRATEGY_XRP_BASE_URL: nonEmptyString.default("http://localhost:8104"),
    AUTH_MODE: authModeSchema.default("dev"),
    SESSION_COOKIE_NAME: nonEmptyString.default("kqd_session"),
    SESSION_COOKIE_SECRET: nonEmptyString.default("dev-session-secret-change-me"),
    INGEST_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
    INGEST_ENABLE_STRATEGY_COLLECTORS: booleanish.default(true),
    INGEST_ENABLE_PUBLISHER_COLLECTOR: booleanish.default(true),
    INGEST_ENABLE_EXECUTOR_COLLECTOR: booleanish.default(true),
    INGEST_ENABLE_RABBITMQ_MANAGEMENT_COLLECTOR: booleanish.default(true),
    INGEST_ENABLE_RABBITMQ_CONSUMERS: booleanish.default(true),
    INGEST_ENABLE_SMOKE_HEARTBEAT_REFRESH: booleanish.default(false),
    OTEL_SERVICE_NAME: nonEmptyString.default("kalshi-quant-dashboard"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
  })
  .passthrough();

export type DashboardEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): DashboardEnv {
  return envSchema.parse(source);
}
