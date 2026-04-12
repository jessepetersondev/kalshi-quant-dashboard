import type { PoolClient } from "pg";

import type {
  AllowedExportResource,
  EffectiveCapability
} from "@kalshi-quant-dashboard/contracts";
import type { PolicyRuleInput, RoleBindingInput } from "@kalshi-quant-dashboard/auth";

import { withClient } from "../../client.js";

export interface ResolvedPolicyRecord {
  readonly accessPolicyId: string;
  readonly precedence: number;
  readonly version: number;
}

export interface ResolvedCapabilityInputs {
  readonly principal: {
    readonly userId: string;
    readonly email: string;
    readonly displayName: string;
  };
  readonly roleBindings: RoleBindingInput[];
  readonly policyRules: PolicyRuleInput[];
  readonly exportGrants: AllowedExportResource[];
  readonly policies: ResolvedPolicyRecord[];
}

interface UserRow {
  readonly user_id: string;
  readonly email: string;
  readonly display_name: string;
}

interface RoleBindingRow {
  readonly role: RoleBindingInput["role"];
  readonly strategy_scope: unknown;
}

interface PolicyRow {
  readonly access_policy_id: string;
  readonly precedence: number;
  readonly version: number;
}

interface PolicyRuleRow {
  readonly access_policy_id: string;
  readonly precedence: number;
  readonly rule_type: PolicyRuleInput["ruleType"];
  readonly effect: PolicyRuleInput["effect"];
  readonly strategy_scope: unknown;
  readonly admin_surface: "alert_rules" | "feature_flags" | "access_policies" | "audit_logs" | null;
}

interface ExportGrantRow {
  readonly access_policy_id: string;
  readonly precedence: number;
  readonly resource: AllowedExportResource["resource"];
  readonly strategy_scope: unknown;
  readonly column_profile: AllowedExportResource["columnProfile"];
}

function toStringArray(value: unknown, fallback: readonly string[] = []): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export class EffectiveCapabilityRepo {
  async resolveInputsForLogin(login: string): Promise<ResolvedCapabilityInputs | null> {
    return withClient((client) => this.resolveInputsForLoginWithClient(client, login));
  }

  async resolveInputsForUserId(userId: string): Promise<ResolvedCapabilityInputs | null> {
    return withClient((client) => this.resolveInputsForUserIdWithClient(client, userId));
  }

  async saveSnapshot(
    userId: string,
    effectiveCapability: EffectiveCapability
  ): Promise<void> {
    await withClient(async (client) => {
      await client.query(
        `
          insert into effective_capability_snapshots (
            effective_capability_snapshot_id,
            user_id,
            resolved_role,
            strategy_scope,
            detail_level_max,
            can_view_raw_payloads,
            can_view_privileged_audit_logs,
            can_manage_alert_rules,
            can_manage_feature_flags,
            can_manage_access_policies,
            allowed_export_resources,
            resolution_version,
            resolved_at
          )
          values (
            $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13
          )
          on conflict (effective_capability_snapshot_id) do update
          set user_id = excluded.user_id,
              resolved_role = excluded.resolved_role,
              strategy_scope = excluded.strategy_scope,
              detail_level_max = excluded.detail_level_max,
              can_view_raw_payloads = excluded.can_view_raw_payloads,
              can_view_privileged_audit_logs = excluded.can_view_privileged_audit_logs,
              can_manage_alert_rules = excluded.can_manage_alert_rules,
              can_manage_feature_flags = excluded.can_manage_feature_flags,
              can_manage_access_policies = excluded.can_manage_access_policies,
              allowed_export_resources = excluded.allowed_export_resources,
              resolution_version = excluded.resolution_version,
              resolved_at = excluded.resolved_at
        `,
        [
          `ecs-${userId}`,
          userId,
          effectiveCapability.resolvedRole,
          JSON.stringify(effectiveCapability.strategyScope),
          effectiveCapability.detailLevelMax,
          effectiveCapability.canViewRawPayloads,
          effectiveCapability.canViewPrivilegedAuditLogs,
          effectiveCapability.canManageAlertRules,
          effectiveCapability.canManageFeatureFlags,
          effectiveCapability.canManageAccessPolicies,
          JSON.stringify(effectiveCapability.allowedExportResources),
          effectiveCapability.resolutionVersion,
          effectiveCapability.resolvedAt ?? new Date().toISOString()
        ]
      );
    });
  }

  private async resolveInputsForLoginWithClient(
    client: PoolClient,
    login: string
  ): Promise<ResolvedCapabilityInputs | null> {
    const userResult = await client.query<UserRow>(
      `
        select user_id, email, display_name
        from users
        where user_id = $1 or email = $1
        limit 1
      `,
      [login]
    );

    if (!userResult.rowCount) {
      return null;
    }

    return this.resolveInputsForUserIdWithClient(client, userResult.rows[0]!.user_id);
  }

  private async resolveInputsForUserIdWithClient(
    client: PoolClient,
    userId: string
  ): Promise<ResolvedCapabilityInputs | null> {
    const userResult = await client.query<UserRow>(
      `
        select user_id, email, display_name
        from users
        where user_id = $1
        limit 1
      `,
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      return null;
    }

    const roleBindingResult = await client.query<RoleBindingRow>(
      `
        select role, strategy_scope
        from role_bindings
        where user_id = $1
          and active = true
      `,
      [userId]
    );
    const roleBindings: RoleBindingInput[] = roleBindingResult.rows.map((row) => ({
      role: row.role,
      strategyScope: toStringArray(row.strategy_scope, ["*"])
    }));

    const roles = roleBindings.map((binding) => binding.role);
    const policyResult = await client.query<PolicyRow>(
      `
        select access_policy_id, precedence, version
        from access_policies
        where enabled = true
          and (
            (subject_type = 'user' and subject_key = $1)
            or (subject_type = 'role' and subject_key = any($2::text[]))
            or subject_type = 'global'
          )
        order by precedence desc, access_policy_id asc
      `,
      [userId, roles]
    );

    const policyIds = policyResult.rows.map((row) => row.access_policy_id);
    const policyRules = policyIds.length
      ? (
          await client.query<PolicyRuleRow>(
            `
              select p.access_policy_id, p.precedence, r.rule_type, r.effect, r.strategy_scope, r.admin_surface
              from access_policies p
              join access_policy_rules r on r.access_policy_id = p.access_policy_id
              where p.access_policy_id = any($1::text[])
              order by p.precedence asc, r.effect asc, r.access_policy_rule_id asc
            `,
            [policyIds]
          )
        ).rows.reduce<PolicyRuleInput[]>((acc, row) => {
          const rule: PolicyRuleInput = {
            ruleType: row.rule_type,
            effect: row.effect
          };

          if (row.strategy_scope) {
            Object.assign(rule, {
              strategyScope: toStringArray(row.strategy_scope)
            });
          }

          if (row.admin_surface) {
            Object.assign(rule, {
              adminSurfaces: [row.admin_surface]
            });
          }

          acc.push(rule);
          return acc;
        }, [])
      : [];
    const exportGrants = policyIds.length
      ? (
          await client.query<ExportGrantRow>(
            `
              select p.access_policy_id, p.precedence, g.resource, g.strategy_scope, g.column_profile
              from access_policies p
              join export_scope_grants g on g.access_policy_id = p.access_policy_id
              where p.access_policy_id = any($1::text[])
              order by p.precedence asc, g.export_scope_grant_id asc
            `,
            [policyIds]
          )
        ).rows.map((row) => ({
          resource: row.resource,
          strategyScope: toStringArray(row.strategy_scope, ["*"]),
          columnProfile: row.column_profile
        }))
      : [];

    return {
      principal: {
        userId: user.user_id,
        email: user.email,
        displayName: user.display_name
      },
      roleBindings,
      policyRules,
      exportGrants,
      policies: policyResult.rows.map((row) => ({
        accessPolicyId: row.access_policy_id,
        precedence: row.precedence,
        version: row.version
      }))
    };
  }
}
