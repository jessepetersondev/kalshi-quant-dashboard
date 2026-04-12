import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

const COMPOSE_FILE = "infra/compose/smoke.yml";

interface SmokePorts {
  readonly postgres: number;
  readonly rabbitmq: number;
  readonly rabbitmqManagement: number;
  readonly api: number;
  readonly ingest: number;
  readonly web: number;
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to resolve a free port.")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function allocateSmokePorts(): Promise<SmokePorts> {
  const [postgres, rabbitmq, rabbitmqManagement, api, ingest, web] = await Promise.all([
    getFreePort(),
    getFreePort(),
    getFreePort(),
    getFreePort(),
    getFreePort(),
    getFreePort()
  ]);

  return {
    postgres,
    rabbitmq,
    rabbitmqManagement,
    api,
    ingest,
    web
  };
}

async function runCommand(
  command: string,
  args: readonly string[],
  options?: { readonly env?: NodeJS.ProcessEnv }
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: options?.env,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

async function waitForUrl(url: string, timeoutMs = 120_000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the timeout window expires.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

describe.sequential("deployment smoke", () => {
  let ports: SmokePorts;
  let smokeEnv: NodeJS.ProcessEnv | undefined;
  let smokeDatabaseUrl = "";

  beforeAll(async () => {
    ports = await allocateSmokePorts();
    smokeDatabaseUrl = `postgres://postgres:postgres@127.0.0.1:${ports.postgres}/kalshi_quant_dashboard`;
    smokeEnv = {
      ...process.env,
      SMOKE_POSTGRES_PORT: String(ports.postgres),
      SMOKE_RABBITMQ_PORT: String(ports.rabbitmq),
      SMOKE_RABBITMQ_MANAGEMENT_PORT: String(ports.rabbitmqManagement),
      SMOKE_API_PORT: String(ports.api),
      SMOKE_INGEST_PORT: String(ports.ingest),
      SMOKE_WEB_PORT: String(ports.web)
    };

    await runCommand("docker", ["build", "-f", "infra/docker/api.Dockerfile", "-t", "kqd-api-smoke:local", "."], {
      env: smokeEnv
    });
    await runCommand(
      "docker",
      ["build", "-f", "infra/docker/ingest.Dockerfile", "-t", "kqd-ingest-smoke:local", "."],
      {
        env: smokeEnv
      }
    );
    await runCommand("docker", ["build", "-f", "infra/docker/web.Dockerfile", "-t", "kqd-web-smoke:local", "."], {
      env: smokeEnv
    });

    await runCommand("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d"], {
      env: smokeEnv
    });

    await waitForUrl(`http://127.0.0.1:${ports.api}/health/ready`);
    await waitForUrl(`http://127.0.0.1:${ports.ingest}/health/ready`);
    await waitForUrl(`http://127.0.0.1:${ports.web}/health/ready`);

    await runCommand("pnpm", ["db:migrate"], {
      env: {
        ...smokeEnv,
        DATABASE_URL: smokeDatabaseUrl
      }
    });
    await runCommand("pnpm", ["db:seed"], {
      env: {
        ...smokeEnv,
        DATABASE_URL: smokeDatabaseUrl
      }
    });
    await runCommand("pnpm", ["exec", "tsx", "scripts/release/seed-smoke.ts"], {
      env: {
        ...smokeEnv,
        DATABASE_URL: smokeDatabaseUrl
      }
    });
  }, 240_000);

  afterAll(async () => {
    if (!smokeEnv) {
      return;
    }

    try {
      await runCommand("docker", ["compose", "-f", COMPOSE_FILE, "down", "-v"], {
        env: smokeEnv
      });
    } catch {
      // Leave teardown best-effort so an earlier failure does not mask the root cause.
    }
  }, 120_000);

  test(
    "validates the deployment stack and release probe flow",
    async () => {
      await runCommand(
        "pnpm",
        [
          "exec",
          "tsx",
          "scripts/release/verify-staging.ts",
          "--base-url",
          `http://127.0.0.1:${ports.web}`
        ],
        { env: smokeEnv }
      );
      await runCommand(
        "pnpm",
        [
          "exec",
          "tsx",
          "scripts/release/promote.ts",
          "--source",
          "infra/kubernetes/overlays/staging/kustomization.yaml",
          "--target",
          "infra/kubernetes/overlays/production/kustomization.yaml"
        ],
        { env: smokeEnv }
      );

      expect(true).toBe(true);
    },
    240_000
  );
});
