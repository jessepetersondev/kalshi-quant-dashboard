import type { PoolClient } from "pg";

export interface SeedUser {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly defaultRole: "operator" | "developer" | "admin";
  readonly strategyScope: readonly string[];
}

export const seedUsers: readonly SeedUser[] = [
  {
    userId: "user-operator",
    email: "operator@example.internal",
    displayName: "Operator",
    defaultRole: "operator",
    strategyScope: ["btc", "eth", "sol", "xrp"]
  },
  {
    userId: "user-developer",
    email: "developer@example.internal",
    displayName: "Developer",
    defaultRole: "developer",
    strategyScope: ["btc", "eth", "sol", "xrp"]
  },
  {
    userId: "user-admin",
    email: "admin@example.internal",
    displayName: "Admin",
    defaultRole: "admin",
    strategyScope: ["*"]
  }
];

export async function seedUsersTable(client: PoolClient): Promise<void> {
  for (const user of seedUsers) {
    await client.query(
      `
        insert into users (user_id, email, display_name, default_role)
        values ($1, $2, $3, $4)
        on conflict (user_id) do update
        set email = excluded.email,
            display_name = excluded.display_name,
            default_role = excluded.default_role,
            updated_at = now()
      `,
      [user.userId, user.email, user.displayName, user.defaultRole]
    );

    await client.query(
      `
        insert into role_bindings (role_binding_id, user_id, role, strategy_scope, active)
        values ($1, $2, $3, $4::jsonb, true)
        on conflict (role_binding_id) do update
        set role = excluded.role,
            strategy_scope = excluded.strategy_scope,
            active = true,
            updated_at = now()
      `,
      [`binding-${user.userId}`, user.userId, user.defaultRole, JSON.stringify(user.strategyScope)]
    );
  }
}
