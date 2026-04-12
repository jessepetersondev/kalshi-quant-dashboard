import { useEffect, useMemo, useState } from "react";

import type { StreamStatusEvent } from "@kalshi-quant-dashboard/contracts";

import { AlertDrawer } from "../components/alerts/AlertDrawer.js";
import { AlertTable } from "../components/alerts/AlertTable.js";
import { ReconnectBanner } from "../components/live/ReconnectBanner.js";
import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { DataTableShell } from "../components/table/DataTableShell.js";
import { createExportHref } from "../features/exports/exportClient.js";
import { connectStream } from "../features/live/streamClient.js";
import { resolveStreamStatus } from "../features/live/streamStatus.js";
import { useGetAlertListQuery } from "../features/alerts/alertsApi.js";
import { buildAlertDrawerSearch } from "../features/router/alertNavigation.js";
import { useLifecycleQueryState } from "../features/router/queryState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";

export function AlertsPage() {
  const { state, setState } = useLifecycleQueryState();
  const { data: session } = useGetSessionQuery();
  const [streamState, setStreamState] = useState<StreamStatusEvent["payload"] | null>(null);
  const { data, error, isLoading, isFetching, refetch } = useGetAlertListQuery({
    page: state.page,
    pageSize: state.pageSize,
    search: state.search || undefined,
    timezone: state.timezone,
    detailLevel: "standard"
  });

  useEffect(() => {
    const disconnect = connectStream(
      {
        channels: ["alerts"],
        timezone: state.timezone,
        detailLevel: "standard"
      },
      {
        onAlertUpsert() {
          void refetch();
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
          void refetch();
        },
        onResyncRequired() {
          setStreamState({
            connectionState: "degraded",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void refetch();
        },
        onError() {
          setStreamState({
            connectionState: "reconnecting",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void refetch();
        }
      }
    );

    return disconnect;
  }, [refetch, state.timezone]);

  const effectiveStreamStatus = useMemo(
    () =>
      resolveStreamStatus({
        status: streamState,
        paused: false,
        fallbackFreshnessTimestamp: data?.items[0]?.latestSeenAt ?? null,
        degraded: Boolean(streamState?.degraded)
      }),
    [data?.items, streamState]
  );
  const canExport = Boolean(
    session?.effectiveCapability.allowedExportResources.some(
      (resource) => resource.resource === "alerts"
    )
  );
  const exportHref = useMemo(
    () =>
      createExportHref("alerts", {
        search: state.search,
        timezone: state.timezone,
        strategy: state.strategy?.join(",")
      }),
    [state.search, state.strategy, state.timezone]
  );

  if (!data && (isLoading || isFetching)) {
    return <LoadingState title="Loading alerts" message="Querying persisted alerts and incidents." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Alerts failed to load"
        message="The alert list API did not return persisted incident rows."
      />
    );
  }

  return (
    <div className="page-stack">
      <ReconnectBanner
        message="The alert stream is reconnecting. The list is being revalidated from persisted history."
        visible={effectiveStreamStatus.connectionState === "reconnecting"}
      />
      <div className="toolbar-row">
        <div className="toolbar-filters">
          <div className="field">
            <label htmlFor="alerts-search">Search</label>
            <input
              id="alerts-search"
              className="search-bar"
              defaultValue={state.search}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setState({
                    search: (event.currentTarget as HTMLInputElement).value,
                    page: 1
                  });
                }
              }}
              placeholder="Alert id, component, summary"
            />
          </div>
        </div>
        <div className="toolbar-actions">
          <button
            className="secondary-button"
            onClick={() => {
              const input = document.getElementById("alerts-search") as HTMLInputElement | null;
              setState({ search: input?.value ?? "", page: 1 });
            }}
            type="button"
          >
            Apply search
          </button>
          {canExport ? (
            <a className="secondary-button" href={exportHref}>
              Export CSV
            </a>
          ) : null}
        </div>
      </div>
      {data.items.length === 0 ? (
        <EmptyState
          title="No alerts matched"
          message="Adjust the alert search to inspect a different incident slice."
        />
      ) : (
        <>
          <DataTableShell
            pageInfo={data.pageInfo}
            summary="Alert history is persisted, paginated, and safe to resume after stream reconnects."
            title="Alerts"
            onNextPage={() => setState({ page: data.pageInfo.page + 1 })}
            onPreviousPage={() => setState({ page: Math.max(1, data.pageInfo.page - 1) })}
          >
            <AlertTable
              onOpenDetail={(alertId) => setState({ detail: alertId })}
              rows={data.items}
              timezone={state.timezone}
            />
          </DataTableShell>
        </>
      )}
      <AlertDrawer
        alertId={state.detail}
        onClose={() => {
          const nextSearch = buildAlertDrawerSearch(window.location.search, null);
          window.history.replaceState({}, "", `${window.location.pathname}${nextSearch}`);
          setState({ detail: null });
        }}
        timezone={state.timezone}
      />
    </div>
  );
}
