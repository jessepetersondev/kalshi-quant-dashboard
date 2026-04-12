import { closePool, query, readMigrationFile } from "./client.js";
import { migrations } from "./migrations.js";

async function ensureMigrationsTable() {
  await query(`
    create table if not exists schema_migrations (
      migration_id text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

export async function migrate(): Promise<void> {
  await ensureMigrationsTable();

  for (const migration of migrations) {
    const existing = await query<{ migration_id: string }>(
      "select migration_id from schema_migrations where migration_id = $1",
      [migration.id]
    );

    if (existing.rowCount) {
      continue;
    }

    const sql = await readMigrationFile(migration.fileName);
    await query("begin");

    try {
      await query(sql);
      await query("insert into schema_migrations (migration_id) values ($1)", [
        migration.id
      ]);
      await query("commit");
    } catch (error) {
      await query("rollback");
      throw error;
    }
  }
}

const isDirectExecution = process.argv[1]?.endsWith("/migrate.ts");

if (isDirectExecution) {
  migrate()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}
