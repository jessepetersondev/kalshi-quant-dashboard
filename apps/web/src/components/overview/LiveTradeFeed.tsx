import type { TradeRow } from "@kalshi-quant-dashboard/contracts";
import { Card, Pill } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";

export function LiveTradeFeed(props: {
  readonly rows: readonly TradeRow[];
  readonly timezone: "utc" | "local";
}) {
  return (
    <Card title="Live Trade Feed" accent="neutral">
      <div className="timeline-list">
        {props.rows.map((row) => (
          <div className="timeline-item" key={`${row.tradeAttemptKey}:${row.latestSeenAt}`}>
            <div className="detail-header">
              <strong>{row.strategyId.toUpperCase()}</strong>
              <Pill tone={row.degraded ? "amber" : "blue"}>{row.status}</Pill>
            </div>
            <div>{row.marketTicker}</div>
            <div className="muted">
              {row.tradeAttemptKey} · {row.lastResultStatus ?? row.publishStatus ?? "in flight"}
            </div>
            <div className="muted">{formatTimestamp(row.latestSeenAt, props.timezone)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
