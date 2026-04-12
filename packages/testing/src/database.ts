import {
  closePool,
  migrate,
  query,
  seedDatabase,
  withClient
} from "@kalshi-quant-dashboard/db";

const FACT_TABLES = [
  "projection_changes",
  "positions",
  "pnl_snapshots",
  "alerts",
  "heartbeats",
  "queue_metrics",
  "fills",
  "trades",
  "decisions",
  "identifier_aliases",
  "event_observations",
  "canonical_events",
  "reconciliation_gaps",
  "ingest_checkpoints",
  "audit_logs",
  "effective_capability_snapshots"
] as const;

const MUTABLE_FOUNDATION_TABLES = [
  "export_scope_grants",
  "access_policy_rules",
  "access_policies",
  "feature_flags",
  "alert_rules"
] as const;

const TEST_DATABASE_LOCK_ID = 42_024_211;

async function withTestDatabaseLock<T>(fn: () => Promise<T>): Promise<T> {
  return withClient(async (client) => {
    await client.query("select pg_advisory_lock($1)", [TEST_DATABASE_LOCK_ID]);

    try {
      return await fn();
    } finally {
      await client.query("select pg_advisory_unlock($1)", [TEST_DATABASE_LOCK_ID]);
    }
  });
}

export async function prepareDatabase(): Promise<void> {
  await withTestDatabaseLock(async () => {
    await migrate();
    await seedDatabase();
  });
}

export async function resetFoundationalState(): Promise<void> {
  await withTestDatabaseLock(async () => {
    await query(`truncate table ${FACT_TABLES.join(", ")} restart identity cascade`);
    await query(
      `truncate table ${MUTABLE_FOUNDATION_TABLES.join(", ")} restart identity cascade`
    );
    await seedDatabase();
  });
}

export async function bootstrapTestDatabase(): Promise<void> {
  await withTestDatabaseLock(async () => {
    await migrate();
    await seedDatabase();
    await query(`truncate table ${FACT_TABLES.join(", ")} restart identity cascade`);
  });
}

export async function shutdownTestDatabase(): Promise<void> {
  await closePool();
}
