import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

import { buildApp } from "./app.js";

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

async function start() {
  const config = createRuntimeConfig();
  const app = await buildApp();

  await app.listen({
    host: "0.0.0.0",
    port: config.apiPort
  });
}

if (isDirectExecution) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
