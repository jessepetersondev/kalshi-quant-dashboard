import { useEffect, useMemo, useState } from "react";

import type { StreamStatusEvent } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { AlertDrawer } from "../components/alerts/AlertDrawer.js";
import { AlertTable } from "../components/alerts/AlertTable.js";
import { ReconnectBanner } from "../components/live/ReconnectBanner.js";
import { PipelineFlowDiagram } from "../components/operations/PipelineFlowDiagram.js";
import { QueueHealthTable } from "../components/operations/QueueHealthTable.js";
import { DegradedStatePanel } from "../components/state/DegradedStatePanel.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { connectStream } from "../features/live/streamClient.js";
import { resolveStreamStatus } from "../features/live/streamStatus.js";
import { useLatestRef } from "../features/live/useLatestRef.js";
import { useGetAlertListQuery } from "../features/alerts/alertsApi.js";
import { useGetOperationsSnapshotQuery } from "../features/operations/operationsApi.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";

function formatOperationsLabel(value: string): string {
  if (value === "kalshi.integration.executor") {
    return "Executor queue";
  }

  if (value === "kalshi.integration.executor.dlq") {
    return "Executor DLQ";
  }

  if (value.startsWith("kalshi-") && value.endsWith("-quant")) {
    return `${value.replace(/^kalshi-/, "").replace(/-quant$/, "").toUpperCase()} strategy`;
  }

  return value;
}

export function OperationsPage() {
  const timezone = useTimezoneQueryState();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamStatusEvent["payload"] | null>(null);
  const operations = useGetOperationsSnapshotQuery({ detailLevel: "standard" });
  const alerts = useGetAlertListQuery({
    page: 1,
    pageSize: 10,
    timezone: timezone.mode,
    detailLevel: "standard",
    status: ["open", "acknowledged"]
  });
  const operationsRefetchRef = useLatestRef(operations.refetch);
  const alertsRefetchRef = useLatestRef(alerts.refetch);

  useEffect(() => {
    const disconnect = connectStream(
      {
        channels: ["operations", "alerts"],
        timezone: timezone.mode,
        detailLevel: "standard"
      },
      {
        onQueueMetricUpsert() {
          void operationsRefetchRef.current();
        },
        onAlertUpsert() {
          void operationsRefetchRef.current();
          void alertsRefetchRef.current();
        },
        onStatus(event) {
          setStreamState(event.payload);
        },
        onGap() {
          setStreamState({
            connectionState: "degraded",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void operationsRefetchRef.current();
          void alertsRefetchRef.current();
        },
        onResyncRequired() {
          setStreamState({
            connectionState: "degraded",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void operationsRefetchRef.current();
          void alertsRefetchRef.current();
        },
        onError() {
          setStreamState({
            connectionState: "reconnecting",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void operationsRefetchRef.current();
          void alertsRefetchRef.current();
        }
      }
    );

    return disconnect;
  }, [alertsRefetchRef, operationsRefetchRef, timezone.mode]);

  const effectiveStreamStatus = useMemo(
    () =>
      resolveStreamStatus({
        status: streamState,
        paused: false,
        fallbackFreshnessTimestamp:
          operations.data?.generatedAt ?? alerts.data?.items[0]?.latestSeenAt ?? null,
        degraded: Boolean(operations.data?.degraded)
      }),
    [alerts.data?.items, operations.data?.degraded, operations.data?.generatedAt, streamState]
  );

  if (
    (!operations.data && (operations.isLoading || operations.isFetching)) ||
    (!alerts.data && (alerts.isLoading || alerts.isFetching))
  ) {
    return (
      <LoadingState
        title="Loading operations"
        message="Querying queue health, component freshness, and live incidents."
      />
    );
  }

  if (operations.error || alerts.error || !operations.data || !alerts.data) {
    return (
      <ErrorState
        title="Operations failed to load"
        message="The API did not return queue health and alert state."
      />
    );
  }

  return (
    <div className="page-stack">
      <ReconnectBanner
        message="The live operations stream is reconnecting. Persisted health facts remain visible."
        visible={effectiveStreamStatus.connectionState === "reconnecting"}
      />
      {operations.data.degraded ? (
        <DegradedStatePanel message="One or more pipeline components are degraded. Backlog, heartbeats, and alerts are shown from persisted data." />
      ) : null}
      <div className="metric-grid">
        <Card title="Open alerts" accent="amber">
          <strong>{operations.data.openAlertCount}</strong>
        </Card>
        <Card title="Queue components" accent="neutral">
          <strong>{operations.data.componentStatus.length}</strong>
        </Card>
      </div>
      <div className="split-grid">
        <QueueHealthTable
          rows={operations.data.queueSummary.map((row) => ({
            ...row,
            queueName: formatOperationsLabel(row.queueName)
          }))}
        />
        <PipelineFlowDiagram
          latencyRows={operations.data.pipelineLatency.map((row) => ({
            ...row,
            componentName: formatOperationsLabel(row.componentName)
          }))}
        />
      </div>
      <div className="split-grid">
        <Card title="Component freshness" accent="neutral">
          <div className="timeline-list">
            {operations.data.componentStatus.map((component) => (
              <div className="timeline-item" key={component.componentName}>
                <div className="detail-header">
                  <strong>{formatOperationsLabel(component.componentName)}</strong>
                  <span className="muted">{component.status}</span>
                </div>
                <div className="muted">{component.detail}</div>
                <div className="muted">{component.freshnessTimestamp ?? "unknown"}</div>
              </div>
            ))}
          </div>
        </Card>
        <AlertTable
          onOpenDetail={setSelectedAlertId}
          rows={alerts.data.items.map((row) => ({
            ...row,
            componentKey: row.componentKey ? formatOperationsLabel(row.componentKey) : row.componentKey
          }))}
          timezone={timezone.mode}
        />
      </div>
      <AlertDrawer
        alertId={selectedAlertId}
        onClose={() => setSelectedAlertId(null)}
        timezone={timezone.mode}
      />
    </div>
  );
}
