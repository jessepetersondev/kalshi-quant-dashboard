import type { PoolClient } from "pg";

export async function seedFeatureFlagsTable(client: PoolClient): Promise<void> {
  const flags = [
    {
      featureFlagKey: "adminControlsEnabled",
      enabled: true,
      description: "Enable admin access-policy and feature-flag pages."
    },
    {
      featureFlagKey: "mixedSourceIngest",
      enabled: true,
      description: "Allow both direct strategy collectors and publisher/executor ingestion."
    },
    {
      featureFlagKey: "debugRawPayloadAccess",
      enabled: true,
      description: "Allow developer/admin raw payload inspection where policy permits."
    }
  ] as const;

  for (const flag of flags) {
    await client.query(
      `
        insert into feature_flags (
          feature_flag_key,
          enabled,
          description,
          version,
          updated_by_user_id
        )
        values ($1, $2, $3, 0, 'user-admin')
        on conflict (feature_flag_key) do update
        set enabled = excluded.enabled,
            description = excluded.description,
            updated_by_user_id = excluded.updated_by_user_id,
            updated_at = now()
      `,
      [flag.featureFlagKey, flag.enabled, flag.description]
    );
  }
}
