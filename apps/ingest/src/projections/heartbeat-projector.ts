import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { query } from "@kalshi-quant-dashboard/db";

export interface HeartbeatProjection {
  readonly componentName: string;
  readonly strategyId: string | null;
  readonly status: "ok" | "degraded" | "missing";
  readonly freshnessTimestamp: string | null;
  readonly detail: string;
}

export async function projectHeartbeatStatuses(args: {
  readonly strategyScope: readonly string[];
}): Promise<HeartbeatProjection[]> {
  const result = await query<{
    component_name: string;
    strategy_id: string | null;
    status: string;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }>(
    `
      select distinct on (component_name)
        component_name,
        strategy_id,
        status,
        metadata,
        occurred_at::text as occurred_at
      from heartbeats
      order by component_name, occurred_at desc
    `
  );

  return result.rows
    .filter((row) => !row.strategy_id || scopeAllows(args.strategyScope, row.strategy_id))
    .map((row) => {
      const freshnessTimestamp = row.occurred_at ? new Date(row.occurred_at).toISOString() : null;
      const ageMs = freshnessTimestamp
        ? Date.now() - new Date(freshnessTimestamp).valueOf()
        : Number.POSITIVE_INFINITY;
      const stale = ageMs > 5 * 60 * 1000;

      return {
        componentName: row.component_name,
        strategyId: row.strategy_id,
        status: stale ? "degraded" : row.status === "ok" ? "ok" : "degraded",
        freshnessTimestamp,
        detail: stale
          ? "Heartbeat is stale."
          : String(row.metadata.mode ?? row.metadata.status ?? row.status)
      } satisfies HeartbeatProjection;
    });
}
