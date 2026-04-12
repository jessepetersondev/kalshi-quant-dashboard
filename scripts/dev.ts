import { spawn } from "node:child_process";

const child = spawn("pnpm", ["exec", "turbo", "run", "dev", "--parallel"], {
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
