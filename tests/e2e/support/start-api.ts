import { execFileSync } from "node:child_process";
import net from "node:net";

import { buildApp } from "../../../apps/api/src/app.js";
import {
  E2E_POSTGRES_CONTAINER_NAME,
  applyE2EEnvironment
} from "./environment.js";
import { createRuntimeConfig } from "../../../packages/config/dist/index.js";
import { migrate, seedDatabase } from "../../../packages/db/dist/db/src/index.js";

async function waitForPort(port: number, host: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const connected = await new Promise<boolean>((resolve) => {
      const socket = net
        .createConnection({ port, host })
        .once("connect", () => {
          socket.destroy();
          resolve(true);
        })
        .once("error", () => {
          socket.destroy();
          resolve(false);
        });
    });

    if (connected) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${host}:${port}.`);
}

async function ensurePostgres(): Promise<void> {
  const inspect = execFileSync(
    "bash",
    [
      "-lc",
      `docker inspect -f '{{.State.Running}}' ${E2E_POSTGRES_CONTAINER_NAME} >/dev/null 2>&1 && echo running || echo missing`
    ],
    { stdio: ["ignore", "pipe", "ignore"] }
  )
    .toString()
    .trim();

  if (inspect !== "running") {
    execFileSync(
      "bash",
      ["-lc", `docker rm -f ${E2E_POSTGRES_CONTAINER_NAME} >/dev/null 2>&1 || true`],
      { stdio: "inherit" }
    );
    execFileSync(
      "docker",
      [
        "run",
        "--rm",
        "--detach",
        "--name",
        E2E_POSTGRES_CONTAINER_NAME,
        "--publish",
        "55432:5432",
        "--env",
        "POSTGRES_DB=kalshi_quant_dashboard",
        "--env",
        "POSTGRES_PASSWORD=postgres",
        "--env",
        "POSTGRES_USER=postgres",
        "postgres:16-alpine"
      ],
      { stdio: "inherit" }
    );
  }

  await waitForPort(55432, "127.0.0.1", 30_000);
}

async function runWithRetries(fn: () => Promise<void>, attempts: number): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fn();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw lastError;
}

async function main(): Promise<void> {
  applyE2EEnvironment();

  await ensurePostgres();
  await runWithRetries(async () => {
    await migrate();
  }, 5);
  await runWithRetries(async () => {
    await seedDatabase();
  }, 5);

  const config = createRuntimeConfig();
  const app = await buildApp();
  await app.listen({
    host: "0.0.0.0",
    port: config.apiPort
  });

  const close = async () => {
    await app.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void close();
  });
  process.once("SIGTERM", () => {
    void close();
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
