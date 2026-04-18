import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  const parsed: Record<string, string> = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const assignment = trimmed.startsWith("export ")
      ? trimmed.slice(7).trim()
      : trimmed;
    const separatorIndex = assignment.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = assignment.slice(0, separatorIndex).trim();
    let value = assignment.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

const rootDir = resolve(".");
const fileEnv = {
  ...parseEnvFile(resolve(rootDir, ".env")),
  ...parseEnvFile(resolve(rootDir, ".env.local")),
};
const runtimeEnv: NodeJS.ProcessEnv = {
  ...fileEnv,
  ...process.env,
};

const apiPort = Number(runtimeEnv.PORT_API ?? 3001);
const ingestPort = Number(runtimeEnv.PORT_INGEST ?? 3002);
const webPort = Number(runtimeEnv.WEB_PORT ?? 3000);
const dashboardUser =
  runtimeEnv.KQD_WATCHDOG_USER ?? "operator@example.internal";
const watchdogInitialDelayMs = Number(
  runtimeEnv.KQD_WATCHDOG_INITIAL_DELAY_MS ?? 30_000
);
const watchdogIntervalMs = Number(
  runtimeEnv.KQD_WATCHDOG_INTERVAL_MS ?? 15_000
);
const watchdogTimeoutMs = Number(runtimeEnv.KQD_WATCHDOG_TIMEOUT_MS ?? 5_000);
const watchdogFailureLimit = Number(runtimeEnv.KQD_WATCHDOG_FAILURE_LIMIT ?? 3);

const children: ChildProcess[] = [];
let shuttingDown = false;
let watchdogFailures = 0;
let watchdogTimer: NodeJS.Timeout | undefined;

function isRunning(child: ChildProcess): boolean {
  return child.exitCode === null && child.signalCode === null;
}

function startChild(name: string, args: readonly string[]): void {
  const child = spawn("pnpm", args, {
    cwd: rootDir,
    env: runtimeEnv,
    stdio: "inherit",
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = code ?? 1;
    console.error(
      `[start] ${name} exited unexpectedly with ${signal ? `signal ${signal}` : `code ${exitCode}`}.`
    );
    shutdown(exitCode);
  });
}

function shutdown(exitCode: number): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (watchdogStartTimer) {
    clearTimeout(watchdogStartTimer);
  }
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
  }

  for (const child of children) {
    if (isRunning(child)) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (isRunning(child)) {
        child.kill("SIGKILL");
      }
    }
    process.exit(exitCode);
  }, 10_000);
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string> = {}
): Promise<void> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(watchdogTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

async function runWatchdog(): Promise<void> {
  const checks = [
    {
      name: "api session",
      url: `http://127.0.0.1:${apiPort}/api/auth/session`,
      headers: { "x-dashboard-user": dashboardUser },
    },
    {
      name: "api strategies",
      url: `http://127.0.0.1:${apiPort}/api/strategies`,
      headers: { "x-dashboard-user": dashboardUser },
    },
    {
      name: "web proxy strategies",
      url: `http://127.0.0.1:${webPort}/api/strategies`,
      headers: { cookie: `kqd_session=${dashboardUser}` },
    },
    {
      name: "ingest liveness",
      url: `http://127.0.0.1:${ingestPort}/api/health/liveness`,
    },
  ];

  const failures: string[] = [];
  await Promise.all(
    checks.map(async (check) => {
      try {
        await fetchWithTimeout(check.url, check.headers);
      } catch (error) {
        failures.push(
          `${check.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  if (failures.length === 0) {
    watchdogFailures = 0;
    return;
  }

  watchdogFailures += 1;
  console.error(
    `[watchdog] ${watchdogFailures}/${watchdogFailureLimit} health checks failed: ${failures.join("; ")}`
  );

  if (watchdogFailures >= watchdogFailureLimit) {
    console.error(
      "[watchdog] failure limit reached; exiting so systemd restarts the dashboard."
    );
    shutdown(1);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

startChild("api", ["--dir", "apps/api", "exec", "tsx", "src/main.ts"]);
startChild("ingest", ["--dir", "apps/ingest", "exec", "tsx", "src/main.ts"]);
startChild("web", [
  "--dir",
  "apps/web",
  "exec",
  "vite",
  "preview",
  "--host",
  "0.0.0.0",
  "--port",
  String(webPort),
  "--strictPort",
]);

const watchdogStartTimer = setTimeout(() => {
  void runWatchdog();
  watchdogTimer = setInterval(() => {
    void runWatchdog();
  }, watchdogIntervalMs);
}, watchdogInitialDelayMs);
