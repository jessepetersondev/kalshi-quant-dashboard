export const E2E_DATABASE_URL =
  "postgres://postgres:postgres@127.0.0.1:55432/kalshi_quant_dashboard";
export const E2E_POSTGRES_CONTAINER_NAME = "kalshi-quant-dashboard-e2e-postgres";
export const E2E_API_URL = "http://127.0.0.1:39001";
export const E2E_WEB_URL = "http://127.0.0.1:39000";

function normalizeColorEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const normalized = { ...env };
  delete normalized.NO_COLOR;
  return normalized;
}

export function applyE2EEnvironment(): void {
  const normalized = normalizeColorEnv(process.env);
  delete process.env.NO_COLOR;
  Object.assign(process.env, normalized);
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
  process.env.AUTH_MODE = "dev";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? E2E_DATABASE_URL;
  process.env.PORT_API = process.env.PORT_API ?? "39001";
  process.env.WEB_PORT = process.env.WEB_PORT ?? "39000";
  process.env.VITE_API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET ?? E2E_API_URL;
}

export function createE2EEnvironment(
  extra: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv {
  applyE2EEnvironment();

  return normalizeColorEnv({
    ...process.env,
    ...extra,
    AUTH_MODE: "dev",
    DATABASE_URL: E2E_DATABASE_URL,
    PORT_API: "39001",
    WEB_PORT: "39000",
    VITE_API_PROXY_TARGET: E2E_API_URL
  });
}
