import type { PoolClient } from "pg";

export async function seedAccessPoliciesTable(client: PoolClient): Promise<void> {
  const policies = [
    {
      accessPolicyId: "policy-operator-default",
      subjectType: "role",
      subjectKey: "operator",
      name: "Operator default scope",
      precedence: 10,
      enabled: true,
      updatedByUserId: "user-admin"
    },
    {
      accessPolicyId: "policy-developer-default",
      subjectType: "role",
      subjectKey: "developer",
      name: "Developer debug scope",
      precedence: 20,
      enabled: true,
      updatedByUserId: "user-admin"
    },
    {
      accessPolicyId: "policy-admin-default",
      subjectType: "role",
      subjectKey: "admin",
      name: "Admin full scope",
      precedence: 30,
      enabled: true,
      updatedByUserId: "user-admin"
    }
  ] as const;

  for (const policy of policies) {
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
        on conflict (access_policy_id) do update
        set subject_type = excluded.subject_type,
            subject_key = excluded.subject_key,
            name = excluded.name,
            precedence = excluded.precedence,
            enabled = excluded.enabled,
            updated_by_user_id = excluded.updated_by_user_id,
            updated_at = now()
      `,
      [
        policy.accessPolicyId,
        policy.subjectType,
        policy.subjectKey,
        policy.name,
        policy.precedence,
        policy.enabled,
        policy.updatedByUserId
      ]
    );
  }

  const rules = [
    {
      accessPolicyRuleId: "policy-rule-developer-raw",
      accessPolicyId: "policy-developer-default",
      ruleType: "raw_payload",
      effect: "allow",
      strategyScope: null,
      adminSurface: null
    },
    {
      accessPolicyRuleId: "policy-rule-developer-debug",
      accessPolicyId: "policy-developer-default",
      ruleType: "debug_stream",
      effect: "allow",
      strategyScope: null,
      adminSurface: null
    },
    {
      accessPolicyRuleId: "policy-rule-admin-access",
      accessPolicyId: "policy-admin-default",
      ruleType: "admin_surface",
      effect: "allow",
      strategyScope: null,
      adminSurface: "access_policies"
    },
    {
      accessPolicyRuleId: "policy-rule-admin-flags",
      accessPolicyId: "policy-admin-default",
      ruleType: "admin_surface",
      effect: "allow",
      strategyScope: null,
      adminSurface: "feature_flags"
    },
    {
      accessPolicyRuleId: "policy-rule-admin-alerts",
      accessPolicyId: "policy-admin-default",
      ruleType: "admin_surface",
      effect: "allow",
      strategyScope: null,
      adminSurface: "alert_rules"
    },
    {
      accessPolicyRuleId: "policy-rule-admin-audit",
      accessPolicyId: "policy-admin-default",
      ruleType: "privileged_audit",
      effect: "allow",
      strategyScope: null,
      adminSurface: null
    }
  ] as const;

  for (const rule of rules) {
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
        on conflict (access_policy_rule_id) do update
        set rule_type = excluded.rule_type,
            effect = excluded.effect,
            strategy_scope = excluded.strategy_scope,
            admin_surface = excluded.admin_surface
      `,
      [
        rule.accessPolicyRuleId,
        rule.accessPolicyId,
        rule.ruleType,
        rule.effect,
        rule.strategyScope ? JSON.stringify(rule.strategyScope) : null,
        rule.adminSurface
      ]
    );
  }

  const grants = [
    {
      exportScopeGrantId: "grant-operator-decisions",
      accessPolicyId: "policy-operator-default",
      resource: "decisions",
      strategyScope: ["btc", "eth", "sol", "xrp"],
      columnProfile: "summary"
    },
    {
      exportScopeGrantId: "grant-operator-skips",
      accessPolicyId: "policy-operator-default",
      resource: "skips",
      strategyScope: ["btc", "eth", "sol", "xrp"],
      columnProfile: "summary"
    },
    {
      exportScopeGrantId: "grant-operator-alerts",
      accessPolicyId: "policy-operator-default",
      resource: "alerts",
      strategyScope: ["btc", "eth", "sol", "xrp"],
      columnProfile: "summary"
    },
    {
      exportScopeGrantId: "grant-operator-pnl",
      accessPolicyId: "policy-operator-default",
      resource: "pnl",
      strategyScope: ["btc", "eth", "sol", "xrp"],
      columnProfile: "summary"
    },
    {
      exportScopeGrantId: "grant-developer-trades",
      accessPolicyId: "policy-developer-default",
      resource: "trades",
      strategyScope: ["btc", "eth", "sol", "xrp"],
      columnProfile: "detailed"
    },
    {
      exportScopeGrantId: "grant-admin-audit",
      accessPolicyId: "policy-admin-default",
      resource: "audit_logs",
      strategyScope: ["*"],
      columnProfile: "raw_payload"
    }
  ] as const;

  for (const grant of grants) {
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
        on conflict (export_scope_grant_id) do update
        set resource = excluded.resource,
            strategy_scope = excluded.strategy_scope,
            column_profile = excluded.column_profile
      `,
      [
        grant.exportScopeGrantId,
        grant.accessPolicyId,
        grant.resource,
        JSON.stringify(grant.strategyScope),
        grant.columnProfile
      ]
    );
  }
}
