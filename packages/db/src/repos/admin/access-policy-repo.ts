import { randomUUID } from "node:crypto";

import type {
  AccessPolicyCreateRequest,
  AccessPolicyDetail,
  AccessPolicyDetailResponse,
  AccessPolicyListItem,
  AccessPolicyListQuery,
  AccessPolicyListResponse,
  AccessPolicyRule,
  AccessPolicyUpdateRequest,
  MutationAudit
} from "@kalshi-quant-dashboard/contracts";
import { pageInfoSchema } from "@kalshi-quant-dashboard/contracts";

import { withClient } from "../../client.js";
import { ExportScopeRepo } from "./export-scope-repo.js";

interface PolicyRow {
  readonly access_policy_id: string;
  readonly subject_type: AccessPolicyListItem["subjectType"];
  readonly subject_key: string;
  readonly name: string;
  readonly precedence: number;
  readonly enabled: boolean;
  readonly version: number;
  readonly updated_by_user_id: string;
  readonly updated_at: Date;
}

interface PolicyRuleRow {
  readonly access_policy_rule_id: string;
  readonly access_policy_id: string;
  readonly rule_type: AccessPolicyRule["ruleType"];
  readonly effect: AccessPolicyRule["effect"];
  readonly strategy_scope: unknown;
  readonly admin_surface: "alert_rules" | "feature_flags" | "access_policies" | "audit_logs" | null;
}

interface AuditRow {
  readonly audit_log_id: string;
  readonly actor_user_id: string;
  readonly action: string;
  readonly result: MutationAudit["result"];
  readonly occurred_at: Date;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function mergeRules(rows: readonly PolicyRuleRow[]): AccessPolicyRule[] {
  const merged = new Map<string, AccessPolicyRule>();

  for (const row of rows) {
    const existing = merged.get(row.access_policy_rule_id);
    if (existing) {
      const adminSurfaces = new Set(existing.adminSurfaces ?? []);
      if (row.admin_surface) {
        adminSurfaces.add(row.admin_surface);
      }
      merged.set(row.access_policy_rule_id, {
        ...existing,
        adminSurfaces: adminSurfaces.size > 0 ? [...adminSurfaces] : existing.adminSurfaces
      });
      continue;
    }

    merged.set(row.access_policy_rule_id, {
      accessPolicyRuleId: row.access_policy_rule_id,
      accessPolicyId: row.access_policy_id,
      ruleType: row.rule_type,
      effect: row.effect,
      strategyScope: toStringArray(row.strategy_scope),
      adminSurfaces: row.admin_surface ? [row.admin_surface] : undefined,
      enabled: true,
      notes: null
    });
  }

  return [...merged.values()];
}

export class AccessPolicyRepo {
  private readonly exportScopeRepo = new ExportScopeRepo();

  async list(query: AccessPolicyListQuery): Promise<AccessPolicyListResponse> {
    return withClient(async (client) => {
      const values: unknown[] = [];
      const whereParts: string[] = [];
      if (query.search?.trim()) {
        values.push(`%${query.search.trim().toLowerCase()}%`);
        whereParts.push(
          `(lower(name) like $${values.length} or lower(subject_key) like $${values.length})`
        );
      }

      const whereClause = whereParts.length > 0 ? `where ${whereParts.join(" and ")}` : "";
      const countResult = await client.query<{ total: string }>(
        `select count(*)::text as total from access_policies ${whereClause}`,
        values
      );
      const totalItems = Number(countResult.rows[0]?.total ?? 0);
      const offset = (query.page - 1) * query.pageSize;
      values.push(query.pageSize, offset);

      const rows = await client.query<PolicyRow>(
        `
          select
            access_policy_id,
            subject_type,
            subject_key,
            name,
            precedence,
            enabled,
            version,
            updated_by_user_id,
            updated_at
          from access_policies
          ${whereClause}
          order by precedence desc, access_policy_id asc
          limit $${values.length - 1}
          offset $${values.length}
        `,
        values
      );

      return {
        items: rows.rows.map((row) => ({
          accessPolicyId: row.access_policy_id,
          subjectType: row.subject_type,
          subjectKey: row.subject_key,
          name: row.name,
          precedence: row.precedence,
          enabled: row.enabled,
          version: row.version,
          updatedByUserId: row.updated_by_user_id,
          updatedAt: row.updated_at.toISOString()
        })),
        pageInfo: pageInfoSchema.parse({
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize))
        })
      };
    });
  }

  async getById(accessPolicyId: string): Promise<AccessPolicyDetailResponse | null> {
    return withClient(async (client) => {
      const policyResult = await client.query<PolicyRow>(
        `
          select
            access_policy_id,
            subject_type,
            subject_key,
            name,
            precedence,
            enabled,
            version,
            updated_by_user_id,
            updated_at
          from access_policies
          where access_policy_id = $1
          limit 1
        `,
        [accessPolicyId]
      );

      const policy = policyResult.rows[0];
      if (!policy) {
        return null;
      }

      const ruleResult = await client.query<PolicyRuleRow>(
        `
          select access_policy_rule_id, access_policy_id, rule_type, effect, strategy_scope, admin_surface
          from access_policy_rules
          where access_policy_id = $1
          order by access_policy_rule_id asc
        `,
        [accessPolicyId]
      );
      const grantsByPolicy = await this.exportScopeRepo.listByPolicyIds(client, [
        accessPolicyId
      ]);
      const auditResult = await client.query<AuditRow>(
        `
          select audit_log_id, actor_user_id, action, result, occurred_at
          from audit_logs
          where target_type = 'access_policy'
            and target_id = $1
          order by occurred_at desc
          limit 20
        `,
        [accessPolicyId]
      );

      const detail: AccessPolicyDetail = {
        accessPolicyId: policy.access_policy_id,
        subjectType: policy.subject_type,
        subjectKey: policy.subject_key,
        name: policy.name,
        precedence: policy.precedence,
        enabled: policy.enabled,
        version: policy.version,
        updatedByUserId: policy.updated_by_user_id,
        updatedAt: policy.updated_at.toISOString(),
        rules: mergeRules(ruleResult.rows),
        exportGrants: grantsByPolicy.get(accessPolicyId) ?? [],
        effectiveCapabilityPreview: [],
        auditTrail: auditResult.rows.map((row) => ({
          auditLogId: row.audit_log_id,
          action: row.action,
          actorUserId: row.actor_user_id,
          occurredAt: row.occurred_at.toISOString(),
          result: row.result
        }))
      };

      return { policy: detail };
    });
  }

  async create(
    request: AccessPolicyCreateRequest,
    actorUserId: string
  ): Promise<AccessPolicyDetail> {
    return withClient(async (client) => {
      const accessPolicyId = randomUUID();
      await client.query(
        `
          insert into access_policies (
            access_policy_id,
            subject_type,
            subject_key,
            name,
            precedence,
            enabled,
            version,
            updated_by_user_id
          )
          values ($1, $2, $3, $4, $5, $6, 0, $7)
        `,
        [
          accessPolicyId,
          request.policy.subjectType,
          request.policy.subjectKey,
          request.policy.name,
          request.policy.precedence,
          request.policy.enabled,
          actorUserId
        ]
      );

      await this.replaceRules(client, accessPolicyId, request.rules);
      await this.exportScopeRepo.replaceForPolicy(client, accessPolicyId, request.exportGrants);

      const created = await this.getById(accessPolicyId);
      if (!created) {
        throw new Error(`Created access policy '${accessPolicyId}' could not be reloaded.`);
      }

      return created.policy;
    });
  }

  async update(
    accessPolicyId: string,
    request: AccessPolicyUpdateRequest,
    actorUserId: string
  ): Promise<{ before: AccessPolicyDetail; after: AccessPolicyDetail }> {
    return withClient(async (client) => {
      const existing = await this.getById(accessPolicyId);
      if (!existing) {
        throw new Error("ACCESS_POLICY_NOT_FOUND");
      }

      if (existing.policy.version !== request.version) {
        throw new Error("ACCESS_POLICY_VERSION_CONFLICT");
      }

      await client.query(
        `
          update access_policies
          set subject_type = $2,
              subject_key = $3,
              name = $4,
              precedence = $5,
              enabled = $6,
              version = version + 1,
              updated_by_user_id = $7,
              updated_at = now()
          where access_policy_id = $1
        `,
        [
          accessPolicyId,
          request.policy.subjectType ?? existing.policy.subjectType,
          request.policy.subjectKey ?? existing.policy.subjectKey,
          request.policy.name ?? existing.policy.name,
          request.policy.precedence ?? existing.policy.precedence,
          request.policy.enabled ?? existing.policy.enabled,
          actorUserId
        ]
      );

      await this.replaceRules(client, accessPolicyId, request.rules);
      await this.exportScopeRepo.replaceForPolicy(client, accessPolicyId, request.exportGrants);

      const updated = await this.getById(accessPolicyId);
      if (!updated) {
        throw new Error(`Updated access policy '${accessPolicyId}' could not be reloaded.`);
      }

      return {
        before: existing.policy,
        after: updated.policy
      };
    });
  }

  private async replaceRules(
    client: import("pg").PoolClient,
    accessPolicyId: string,
    rules: readonly Omit<AccessPolicyRule, "accessPolicyId" | "accessPolicyRuleId">[]
  ): Promise<void> {
    await client.query("delete from access_policy_rules where access_policy_id = $1", [
      accessPolicyId
    ]);

    for (const rule of rules) {
      const accessPolicyRuleId = randomUUID();
      const adminSurfaces = rule.adminSurfaces?.length
        ? rule.adminSurfaces
        : [null];

      for (const adminSurface of adminSurfaces) {
        await client.query(
          `
            insert into access_policy_rules (
              access_policy_rule_id,
              access_policy_id,
              rule_type,
              effect,
              strategy_scope,
              admin_surface
            )
            values ($1, $2, $3, $4, $5::jsonb, $6)
          `,
          [
            accessPolicyRuleId,
            accessPolicyId,
            rule.ruleType,
            rule.effect,
            rule.strategyScope?.length ? JSON.stringify(rule.strategyScope) : null,
            adminSurface
          ]
        );
      }
    }
  }
}
