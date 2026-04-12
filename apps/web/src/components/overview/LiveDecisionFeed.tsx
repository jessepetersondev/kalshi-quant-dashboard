import type { DecisionRow } from "@kalshi-quant-dashboard/contracts";
import { Card, Pill } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";

export function LiveDecisionFeed(props: {
  readonly rows: readonly DecisionRow[];
  readonly timezone: "utc" | "local";
}) {
  return (
    <Card title="Live Decision Feed" accent="neutral">
      <div className="timeline-list">
        {props.rows.map((row) => (
          <div className="timeline-item" key={`${row.correlationId}:${row.latestEventAt}`}>
            <div className="detail-header">
              <strong>{row.strategyId.toUpperCase()}</strong>
              <Pill tone={row.sourcePathMode === "hybrid" ? "blue" : "teal"}>
                {row.sourcePathMode}
              </Pill>
            </div>
            <div>{row.marketTicker}</div>
            <div className="muted">
              {row.decisionAction} · {row.reasonSummary ?? "no reason"}
            </div>
            <div className="muted">{formatTimestamp(row.latestEventAt, props.timezone)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
