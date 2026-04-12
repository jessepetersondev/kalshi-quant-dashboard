import type {
  FeatureFlagMutation,
  FeatureFlagState
} from "@kalshi-quant-dashboard/contracts";
import { withClient } from "../../client.js";

interface FeatureFlagRow {
  readonly feature_flag_key: string;
  readonly enabled: boolean;
  readonly description: string;
  readonly version: number;
  readonly updated_by_user_id: string;
  readonly updated_at: Date;
}

function mapFeatureFlag(row: FeatureFlagRow): FeatureFlagState {
  return {
    featureFlagKey: row.feature_flag_key,
    enabled: row.enabled,
    description: row.description,
    version: row.version,
    updatedByUserId: row.updated_by_user_id,
    updatedAt: row.updated_at.toISOString()
  };
}

export class FeatureFlagRepo {
  async list(): Promise<FeatureFlagState[]> {
    return withClient(async (client) => {
      const result = await client.query<FeatureFlagRow>(
        `
          select feature_flag_key, enabled, description, version, updated_by_user_id, updated_at
          from feature_flags
          order by feature_flag_key asc
        `
      );

      return result.rows.map(mapFeatureFlag);
    });
  }

  async get(featureFlagKey: string): Promise<FeatureFlagState | null> {
    return withClient(async (client) => {
      const result = await client.query<FeatureFlagRow>(
        `
          select feature_flag_key, enabled, description, version, updated_by_user_id, updated_at
          from feature_flags
          where feature_flag_key = $1
          limit 1
        `,
        [featureFlagKey]
      );

      return result.rows[0] ? mapFeatureFlag(result.rows[0]) : null;
    });
  }

  async update(
    featureFlagKey: string,
    input: FeatureFlagMutation,
    actorUserId: string
  ): Promise<{ before: FeatureFlagState; after: FeatureFlagState }> {
    return withClient(async (client) => {
      const existing = await this.get(featureFlagKey);
      if (!existing) {
        throw new Error("FEATURE_FLAG_NOT_FOUND");
      }

      if (existing.version !== input.version) {
        throw new Error("FEATURE_FLAG_VERSION_CONFLICT");
      }

      await client.query(
        `
          update feature_flags
          set enabled = $2,
              version = version + 1,
              updated_by_user_id = $3,
              updated_at = now()
          where feature_flag_key = $1
        `,
        [featureFlagKey, input.enabled, actorUserId]
      );

      const updated = await this.get(featureFlagKey);
      if (!updated) {
        throw new Error(`Feature flag '${featureFlagKey}' could not be reloaded.`);
      }

      return {
        before: existing,
        after: updated
      };
    });
  }
}
