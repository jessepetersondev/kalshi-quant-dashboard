import { useState } from "react";

import { Link, useLocation, useParams } from "react-router-dom";

import { Card } from "@kalshi-quant-dashboard/ui";

import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { AlertDrawer } from "../components/alerts/AlertDrawer.js";
import { AlertLink } from "../components/alerts/AlertLink.js";
import { StrategyDetailHeader } from "../components/strategies/StrategyDetailHeader.js";
import { formatTimestamp } from "../features/format/dateTime.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";
import { useGetStrategyDetailQuery } from "../features/strategies/strategiesApi.js";

export function StrategyDetailPage() {
  const params = useParams();
  const location = useLocation();
  const timezone = useTimezoneQueryState();
  const strategyId = params.strategyId ?? "";
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const { data, error, isLoading, isFetching } = useGetStrategyDetailQuery(strategyId, {
    skip: strategyId.length === 0
  });

  if (isLoading || isFetching) {
    return <LoadingState title="Loading strategy detail" message="Resolving current health, recent activity, and PnL." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Strategy detail failed to load"
        message={`The strategy '${strategyId}' is unavailable for this session.`}
      />
    );
  }

  return (
    <div className="page-stack">
      <div>
        <Link className="linkish" to={`/strategies${location.search}`}>
          Back to strategies
        </Link>
      </div>
      <StrategyDetailHeader detail={data} timezone={timezone.mode} />
      <div className="split-grid">
        <Card title="Recent Decisions">
          <div className="timeline-list">
            {data.recentDecisions.length === 0 ? (
              <EmptyState
                title="No recent decisions"
                message="This strategy has not emitted decision facts in the current fixture set."
              />
            ) : (
              data.recentDecisions.map((row) => (
                <div className="timeline-item" key={`${row.correlationId}:${row.latestEventAt}`}>
                  <strong>{row.marketTicker}</strong>
                  <div className="muted">{row.reasonSummary ?? "no reason"}</div>
                  <div className="muted">{formatTimestamp(row.latestEventAt, timezone.mode)}</div>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card title="Recent Trades">
          <div className="timeline-list">
            {data.recentTrades.map((row) => (
              <div className="timeline-item" key={`${row.tradeAttemptKey}:${row.latestSeenAt}`}>
                <strong>{row.tradeAttemptKey}</strong>
                <div className="muted">{row.status}</div>
                <div className="muted">{formatTimestamp(row.latestSeenAt, timezone.mode)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="split-grid">
        <Card title="Recent Skips">
          <div className="timeline-list">
            {data.recentSkips.map((row) => (
              <div className="timeline-item" key={`${row.correlationId}:${row.occurredAt}`}>
                <strong>{row.skipCategory}</strong>
                <div className="muted">{row.reasonRaw}</div>
                <div className="muted">{formatTimestamp(row.occurredAt, timezone.mode)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Active Alerts">
          <div className="timeline-list">
            {data.activeAlerts.length === 0 ? (
              <EmptyState
                title="No active alerts"
                message="The strategy currently has no open or acknowledged alerts."
              />
            ) : (
              data.activeAlerts.map((row) => (
                <div className="timeline-item" key={row.alertId}>
                  <AlertLink
                    alertId={row.alertId}
                    label={row.summary}
                    onOpen={setSelectedAlertId}
                  />
                  <div className="muted">{row.alertType}</div>
                  <div className="muted">{formatTimestamp(row.latestSeenAt, timezone.mode)}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      <AlertDrawer
        alertId={selectedAlertId}
        onClose={() => setSelectedAlertId(null)}
        timezone={timezone.mode}
      />
    </div>
  );
}
