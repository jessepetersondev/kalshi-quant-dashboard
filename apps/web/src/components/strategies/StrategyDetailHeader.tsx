import type { StrategyDetailResponse } from "@kalshi-quant-dashboard/contracts";
import { Card, Pill } from "@kalshi-quant-dashboard/ui";

import { formatCurrency, formatTimestamp } from "../../features/format/dateTime.js";

export function StrategyDetailHeader(props: {
  readonly detail: StrategyDetailResponse;
  readonly timezone: "utc" | "local";
}) {
  const { strategy, pnlSummary } = props.detail;

  return (
    <Card accent={strategy.healthStatus === "degraded" ? "amber" : "blue"}>
      <div className="detail-header">
        <div>
          <p className="eyebrow">{strategy.symbol}</p>
          <h1 style={{ margin: "0.15rem 0 0.5rem" }}>{strategy.displayName}</h1>
          <div className="muted">
            Heartbeat: {formatTimestamp(strategy.latestHeartbeatAt ?? null, props.timezone)}
          </div>
        </div>
        <div className="pill-row">
          <Pill tone={strategy.sourcePathMode === "hybrid" ? "blue" : "teal"}>
            {strategy.sourcePathMode}
          </Pill>
          <Pill tone={strategy.healthStatus === "degraded" ? "amber" : "teal"}>
            {strategy.healthStatus}
          </Pill>
        </div>
      </div>
      <div className="metric-grid" style={{ marginTop: "1rem" }}>
        <div className="kv-item">
          <strong>Realized net</strong>
          <span>{formatCurrency(pnlSummary.realizedPnlNet)}</span>
        </div>
        <div className="kv-item">
          <strong>Unrealized net</strong>
          <span>{formatCurrency(pnlSummary.unrealizedPnlNet)}</span>
        </div>
        <div className="kv-item">
          <strong>Fees</strong>
          <span>{formatCurrency(pnlSummary.feesTotal)}</span>
        </div>
      </div>
    </Card>
  );
}
