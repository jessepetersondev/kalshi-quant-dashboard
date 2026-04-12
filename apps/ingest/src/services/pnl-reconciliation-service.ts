import { withClient } from "@kalshi-quant-dashboard/db";

import { projectMarketPositionAttribution } from "../projections/market-position-projector.js";

export class PnlReconciliationService {
  async reconcileStrategies(strategyIds: readonly string[]): Promise<number> {
    const uniqueStrategyIds = [...new Set(strategyIds)].filter(Boolean);
    if (uniqueStrategyIds.length === 0) {
      return 0;
    }

    const rows = await projectMarketPositionAttribution({
      strategyScope: uniqueStrategyIds
    });
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const current = grouped.get(row.strategyId) ?? [];
      current.push(row);
      grouped.set(row.strategyId, current);
    }

    await withClient(async (client) => {
      for (const [strategyId, strategyRows] of grouped.entries()) {
        const realizedPnl = strategyRows.reduce((sum, row) => sum + row.realizedPnlNet, 0);
        const unrealizedPnl = strategyRows.reduce((sum, row) => sum + row.unrealizedPnlNet, 0);
        const fees = strategyRows.reduce((sum, row) => sum + row.feesTotal, 0);
        const totalPnl = realizedPnl + unrealizedPnl;
        const occurredAt = strategyRows.map((row) => row.freshnessTimestamp).sort().at(-1);
        const disagreementCount = strategyRows.filter((row) => row.disagreement).length;

        await client.query(
          `
            insert into pnl_snapshots (
              pnl_snapshot_id,
              canonical_event_id,
              strategy_id,
              symbol,
              market_ticker,
              bucket_type,
              range_start,
              range_end,
              realized_pnl,
              unrealized_pnl,
              fees,
              total_pnl,
              stale,
              partial,
              valuation_source,
              metadata,
              occurred_at
            )
            values (
              $1,
              null,
              $2,
              $3,
              null,
              'current_reconciled',
              null,
              null,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              'hybrid',
              $10::jsonb,
              $11
            )
            on conflict (pnl_snapshot_id) do update
            set realized_pnl = excluded.realized_pnl,
                unrealized_pnl = excluded.unrealized_pnl,
                fees = excluded.fees,
                total_pnl = excluded.total_pnl,
                stale = excluded.stale,
                partial = excluded.partial,
                metadata = excluded.metadata,
                occurred_at = excluded.occurred_at
          `,
          [
            `reconciled:${strategyId}:current`,
            strategyId,
            strategyId.toUpperCase(),
            realizedPnl,
            unrealizedPnl,
            fees,
            totalPnl,
            strategyRows.some((row) => row.stale),
            strategyRows.some((row) => row.partial),
            JSON.stringify({
              disagreementCount,
              valuationSource: "hybrid",
              markets: strategyRows.length
            }),
            occurredAt ?? new Date().toISOString()
          ]
        );

        await client.query(
          `
            insert into projection_changes (
              channel,
              entity_type,
              entity_id,
              correlation_id,
              effective_occurred_at,
              detail_level,
              payload
            )
            values ('pnl', 'pnl_snapshot', $1, $2, $3, 'standard', $4::jsonb)
          `,
          [
            `reconciled:${strategyId}:current`,
            `${strategyId}:pnl`,
            occurredAt ?? new Date().toISOString(),
            JSON.stringify({
              scopeType: "strategy",
              scopeKey: strategyId,
              bucketType: "current_reconciled"
            })
          ]
        );
      }
    });

    return grouped.size;
  }
}
