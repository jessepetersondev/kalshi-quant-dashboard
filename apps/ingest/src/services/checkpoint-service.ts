import { withClient } from "@kalshi-quant-dashboard/db";

export class CheckpointService {
  async saveCheckpoint(args: {
    readonly checkpointKey: string;
    readonly sourceBindingId?: string | undefined;
    readonly projectionCursor?: string | undefined;
    readonly metadata?: Record<string, unknown> | undefined;
  }): Promise<void> {
    await withClient(async (client) => {
      await client.query(
        `
          insert into ingest_checkpoints (
            checkpoint_key,
            source_binding_id,
            projection_cursor,
            last_observed_at,
            metadata,
            updated_at
          )
          values ($1, $2, $3, now(), $4::jsonb, now())
          on conflict (checkpoint_key) do update
          set source_binding_id = excluded.source_binding_id,
              projection_cursor = excluded.projection_cursor,
              last_observed_at = excluded.last_observed_at,
              metadata = excluded.metadata,
              updated_at = now()
        `,
        [
          args.checkpointKey,
          args.sourceBindingId ?? null,
          args.projectionCursor ?? null,
          JSON.stringify(args.metadata ?? {})
        ]
      );
    });
  }

  async getCheckpoint(checkpointKey: string): Promise<{
    projectionCursor: string | null;
    metadata: Record<string, unknown>;
  } | null> {
    return withClient(async (client) => {
      const result = await client.query<{
        projection_cursor: string | null;
        metadata: Record<string, unknown>;
      }>(
        `
          select projection_cursor, metadata
          from ingest_checkpoints
          where checkpoint_key = $1
        `,
        [checkpointKey]
      );

      if (!result.rowCount) {
        return null;
      }

      return {
        projectionCursor: result.rows[0]!.projection_cursor,
        metadata: result.rows[0]!.metadata
      };
    });
  }
}
