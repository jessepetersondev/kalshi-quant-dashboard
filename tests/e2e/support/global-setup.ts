import { execFileSync } from "node:child_process";
import net from "node:net";

import { E2E_POSTGRES_CONTAINER_NAME, applyE2EEnvironment } from "./environment.js";

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

export default async function globalSetup(): Promise<void> {
  applyE2EEnvironment();

  execFileSync("bash", ["-lc", `docker rm -f ${E2E_POSTGRES_CONTAINER_NAME} >/dev/null 2>&1 || true`], {
    stdio: "inherit"
  });
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
    {
      stdio: "inherit"
    }
  );

  await waitForPort(55432, "127.0.0.1", 30_000);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  globalSetup().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
