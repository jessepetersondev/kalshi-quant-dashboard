import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow
} from "pg";

import { getServerSecrets } from "@kalshi-quant-dashboard/config";

import * as schema from "./schema/index.js";

let poolSingleton: Pool | undefined;

function shouldIgnorePoolError(
  pool: Pool,
  error: Error,
  client?: PoolClient
): boolean {
  const clientEnding = Boolean(
    (client as PoolClient & { _ending?: boolean } | undefined)?._ending
  );

  return (
    (pool.ending || clientEnding) &&
    /Connection terminated unexpectedly/i.test(error.message)
  );
}

export function createPool(connectionString = getServerSecrets().secrets.databaseUrl): Pool {
  const pool = new Pool({
    connectionString
  });

  pool.on("error", (error, client) => {
    if (shouldIgnorePoolError(pool, error, client)) {
      return;
    }
    console.error("PostgreSQL pool error", error);
  });

  return pool;
}

export function getPool(): Pool {
  poolSingleton ??= createPool();
  return poolSingleton;
}

export function getDb(pool = getPool()) {
  return drizzle(pool, { schema });
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>,
  pool = getPool()
): Promise<T> {
  const client = await pool.connect();

  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
  pool = getPool()
): Promise<QueryResult<T>> {
  return pool.query<T>(text, [...values]);
}

export async function closePool(): Promise<void> {
  if (poolSingleton) {
    await poolSingleton.end();
    poolSingleton = undefined;
  }
}

export async function readMigrationFile(fileName: string): Promise<string> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    join(currentDir, "..", "migrations", fileName),
    join(currentDir, "..", "..", "migrations", fileName),
    join(currentDir, "..", "..", "..", "migrations", fileName)
  ];

  for (const path of candidatePaths) {
    try {
      return await readFile(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to locate migration file ${fileName} from ${currentDir}. Checked: ${candidatePaths.join(", ")}`
  );
}
