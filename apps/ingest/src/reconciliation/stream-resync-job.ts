import { query } from "@kalshi-quant-dashboard/db";

export class StreamResyncJob {
  async getLatestCursor(channel: string): Promise<number> {
    const result = await query<{ projection_change_id: number }>(
      `
        select coalesce(max(projection_change_id), 0)::int as projection_change_id
        from projection_changes
        where channel = $1
      `,
      [channel]
    );

    return result.rows[0]?.projection_change_id ?? 0;
  }
}
