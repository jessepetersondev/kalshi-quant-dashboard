import { Card } from "@kalshi-quant-dashboard/ui";

import { DegradedStatePanel } from "../components/state/DegradedStatePanel.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { formatTimestamp } from "../features/format/dateTime.js";
import { useGetSystemHealthQuery } from "../features/operations/operationsApi.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";

export function SystemHealthPage() {
  const timezone = useTimezoneQueryState();
  const { data, error, isLoading, isFetching } = useGetSystemHealthQuery();

  if (isLoading || isFetching) {
    return <LoadingState title="Loading system health" message="Querying persisted health components." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="System health failed to load"
        message="The API could not return the current health projection."
      />
    );
  }

  return (
    <div className="page-stack">
      {data.overview.degraded ? (
        <DegradedStatePanel
          message={data.degradedReasons.join(" · ") || "One or more system-health components are degraded."}
        />
      ) : null}
      <div className="metric-grid">
        <Card title="Global status" accent="neutral">
          <strong>{data.overview.status}</strong>
          <div className="muted">
            {formatTimestamp(data.overview.freshnessTimestamp, timezone.mode)}
          </div>
        </Card>
        <Card title="Degraded reasons" accent="neutral">
          <strong>{data.degradedReasons.length}</strong>
          <div className="muted">explicit health degradations</div>
        </Card>
      </div>
      <Card title="Components" accent="neutral">
        <div className="timeline-list">
          {data.components.map((component) => (
            <div className="timeline-item" key={component.componentName}>
              <div className="detail-header">
                <strong>{component.componentName}</strong>
                <span className="muted">{component.status}</span>
              </div>
              <div className="muted">{component.detail}</div>
              <div className="muted">
                {formatTimestamp(component.freshnessTimestamp ?? null, timezone.mode)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
