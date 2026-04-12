import { execFileSync } from "node:child_process";

import { E2E_POSTGRES_CONTAINER_NAME } from "./environment.js";

export default async function globalTeardown(): Promise<void> {
  execFileSync("bash", ["-lc", `docker rm -f ${E2E_POSTGRES_CONTAINER_NAME} >/dev/null 2>&1 || true`], {
    stdio: "inherit"
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  globalTeardown().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
