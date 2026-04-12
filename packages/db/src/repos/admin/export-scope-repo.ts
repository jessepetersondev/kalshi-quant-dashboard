import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";

import type { ExportScopeGrant } from "@kalshi-quant-dashboard/contracts";

function normalizeStrategyScope(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export class ExportScopeRepo {
  async listByPolicyIds(
    client: PoolClient,
    accessPolicyIds: readonly string[]
  ): Promise<Map<string, ExportScopeGrant[]>> {
    if (accessPolicyIds.length === 0) {
      return new Map();
    }

    const result = await client.query<{
      export_scope_grant_id: string;
      access_policy_id: string;
      resource: ExportScopeGrant["resource"];
      strategy_scope: unknown;
      column_profile: ExportScopeGrant["columnProfile"];
    }>(
      `
        select export_scope_grant_id, access_policy_id, resource, strategy_scope, column_profile
        from export_scope_grants
        where access_policy_id = any($1::text[])
        order by access_policy_id asc, export_scope_grant_id asc
      `,
      [accessPolicyIds]
    );

    const grantsByPolicy = new Map<string, ExportScopeGrant[]>();
    for (const row of result.rows) {
      const current = grantsByPolicy.get(row.access_policy_id) ?? [];
      current.push({
        exportScopeGrantId: row.export_scope_grant_id,
        accessPolicyId: row.access_policy_id,
        resource: row.resource,
        strategyScope: normalizeStrategyScope(row.strategy_scope),
        columnProfile: row.column_profile,
        enabled: true
      });
      grantsByPolicy.set(row.access_policy_id, current);
    }

    return grantsByPolicy;
  }

  async replaceForPolicy(
    client: PoolClient,
    accessPolicyId: string,
    grants: readonly Omit<ExportScopeGrant, "accessPolicyId" | "exportScopeGrantId">[]
  ): Promise<ExportScopeGrant[]> {
    await client.query(
      "delete from export_scope_grants where access_policy_id = $1",
      [accessPolicyId]
    );

    const inserted: ExportScopeGrant[] = [];
    for (const grant of grants) {
      const exportScopeGrantId = randomUUID();
      await client.query(
        `
          insert into export_scope_grants (
            export_scope_grant_id,
            access_policy_id,
            resource,
            strategy_scope,
            column_profile
          )
          values ($1, $2, $3, $4::jsonb, $5)
        `,
        [
          exportScopeGrantId,
          accessPolicyId,
          grant.resource,
          JSON.stringify(grant.strategyScope),
          grant.columnProfile
        ]
      );

      inserted.push({
        exportScopeGrantId,
        accessPolicyId,
        resource: grant.resource,
        strategyScope: [...grant.strategyScope],
        columnProfile: grant.columnProfile,
        enabled: grant.enabled ?? true
      });
    }

    return inserted;
  }
}
