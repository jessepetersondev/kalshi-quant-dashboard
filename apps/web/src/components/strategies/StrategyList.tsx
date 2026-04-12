import type { StrategySummary } from "@kalshi-quant-dashboard/contracts";
import { Link, useLocation } from "react-router-dom";

import { Card, Pill } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";

export function StrategyList(props: {
  readonly items: readonly StrategySummary[];
  readonly timezone: "utc" | "local";
}) {
  const location = useLocation();

  return (
    <div className="screen-grid">
      {props.items.map((strategy) => (
        <Card accent={strategy.healthStatus === "degraded" ? "amber" : "teal"} key={strategy.strategyId}>
          <div className="detail-header">
            <div>
              <strong>{strategy.displayName}</strong>
              <div className="muted">{strategy.symbol}</div>
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
          <div className="session-meta">
            <span>
              Heartbeat: {formatTimestamp(strategy.latestHeartbeatAt ?? null, props.timezone)}
            </span>
            <span>
              PnL snapshot:{" "}
              {formatTimestamp(strategy.latestPnlSnapshotAt ?? null, props.timezone)}
            </span>
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <Link className="linkish" to={`/strategies/${strategy.strategyId}${location.search}`}>
              Open strategy detail
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
