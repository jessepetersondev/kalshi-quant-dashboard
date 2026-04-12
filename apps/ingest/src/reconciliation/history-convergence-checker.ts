import { query } from "@kalshi-quant-dashboard/db";

export class HistoryConvergenceChecker {
  async checkCorrelation(correlationId: string): Promise<{ readonly matches: boolean }> {
    const result = await query<{ total_events: number; total_observations: number }>(
      `
        select
          (select count(*)::int from canonical_events where correlation_id = $1) as total_events,
          (
            select count(*)::int
            from event_observations eo
            inner join canonical_events ce
              on ce.canonical_event_id = eo.canonical_event_id
            where ce.correlation_id = $1
          ) as total_observations
      `,
      [correlationId]
    );
    const row = result.rows[0];

    return {
      matches: Boolean(row && row.total_events > 0 && row.total_observations >= row.total_events)
    };
  }
}
