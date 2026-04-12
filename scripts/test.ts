import { spawn } from "node:child_process";

const knownTargets = new Set(["unit", "integration", "contract", "smoke", "e2e"]);
const args = process.argv.slice(2);
const target = knownTargets.has(args[0] ?? "") ? (args[0] as string) : "unit";
const forwardedArgs = knownTargets.has(args[0] ?? "") ? args.slice(1) : args;
const integrationArgs =
  target === "integration" || target === "smoke"
    ? ["--pool=forks", "--poolOptions.forks.singleFork", "--maxWorkers=1"]
    : [];

function normalizeColorEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const normalized = { ...env };
  delete normalized.NO_COLOR;
  return normalized;
}

const command =
  target === "e2e"
    ? [
        "pnpm",
        [
          "exec",
          "playwright",
          "test",
          "--config=playwright.config.ts",
          ...forwardedArgs,
          "--pass-with-no-tests"
        ]
      ]
    : [
        "pnpm",
        [
          "exec",
          "vitest",
          "--config",
          "vitest.config.ts",
          "run",
          "--project",
          target,
          ...integrationArgs,
          ...forwardedArgs,
          "--passWithNoTests"
        ]
      ];

const child = spawn(command[0], command[1], {
  env: normalizeColorEnv(process.env),
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
