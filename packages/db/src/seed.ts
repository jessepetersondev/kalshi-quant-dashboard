import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { closePool, withClient } from "./client.js";
import { seedAccessPoliciesTable } from "./seed/access-policies.js";
import { seedAlertRulesTable } from "./seed/alert-rules.js";
import { seedFeatureFlagsTable } from "./seed/feature-flags.js";
import { seedSourceBindingsTable } from "./seed/source-bindings.js";
import { seedStrategiesTable } from "./seed/strategies.js";
import { seedUsersTable } from "./seed/users.js";

async function verifyFixtures(): Promise<void> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const root = join(currentDir, "seed", "fixtures");

  for await (const path of glob("**/*.json", { cwd: root })) {
    JSON.parse(await readFile(join(root, path), "utf8"));
  }
}

export async function seedDatabase(): Promise<void> {
  await verifyFixtures();

  await withClient(async (client) => {
    await client.query("begin");

    try {
      await seedUsersTable(client);
      await seedStrategiesTable(client);
      await seedSourceBindingsTable(client);
      await seedAccessPoliciesTable(client);
      await seedFeatureFlagsTable(client);
      await seedAlertRulesTable(client);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

const isDirectExecution = process.argv[1]?.endsWith("/seed.ts");

if (isDirectExecution) {
  seedDatabase()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}
