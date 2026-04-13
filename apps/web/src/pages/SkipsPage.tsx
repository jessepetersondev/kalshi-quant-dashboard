import { useEffect, useMemo, useState } from "react";

import type { StreamStatusEvent } from "@kalshi-quant-dashboard/contracts";
import { Card, VirtualizedDataTable } from "@kalshi-quant-dashboard/ui";

import { FreshnessBanner } from "../components/live/FreshnessBanner.js";
import { ReconnectBanner } from "../components/live/ReconnectBanner.js";
import { SearchBar } from "../components/lifecycle/SearchBar.js";
import { SkipTaxonomyTable } from "../components/skips/SkipTaxonomyTable.js";
import { DegradedStatePanel } from "../components/state/DegradedStatePanel.js";
import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { DataTableShell } from "../components/table/DataTableShell.js";
import { formatTimestamp } from "../features/format/dateTime.js";
import { createExportHref } from "../features/exports/exportClient.js";
import { connectStream } from "../features/live/streamClient.js";
import { resolveStreamStatus } from "../features/live/streamStatus.js";
import { useLatestRef } from "../features/live/useLatestRef.js";
import { useLifecycleQueryState } from "../features/router/queryState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";
import { useGetSkipListQuery } from "../features/skips/skipsApi.js";

function formatCorrelationPreview(correlationId: string): string {
  const parts = correlationId.split(":").filter(Boolean);
  if (parts.length < 2) {
    return correlationId;
  }

  const source = parts[0] ?? correlationId;
  const occurredAt = parts.at(-1) ?? correlationId;
  return `${source} · ${occurredAt}`;
}

export function SkipsPage() {
  const { state, setState } = useLifecycleQueryState();
  const { data: session } = useGetSessionQuery();
  const [streamState, setStreamState] = useState<StreamStatusEvent["payload"] | null>(null);
  const { data, error, isLoading, isFetching, refetch } = useGetSkipListQuery({
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    search: state.search || undefined,
    timezone: state.timezone,
    range: state.range,
    strategy: state.strategy,
    symbol: state.symbol,
    market: state.market
  });
  const refetchRef = useLatestRef(refetch);
  const strategyKey = state.strategy?.join(",") ?? "";
  const strategyFilter = useMemo(
    () => (strategyKey ? strategyKey.split(",") : undefined),
    [strategyKey]
  );

  useEffect(() => {
    const disconnect = connectStream(
      {
        channels: ["skips"],
        timezone: state.timezone,
        detailLevel: "standard",
        ...(strategyFilter ? { strategy: strategyFilter } : {})
      },
      {
        onSkipUpsert() {
          void refetchRef.current();
        },
        onGap() {
          setStreamState({
            connectionState: "degraded",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void refetchRef.current();
        },
        onResyncRequired() {
          setStreamState({
            connectionState: "degraded",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void refetchRef.current();
        },
        onError() {
          setStreamState({
            connectionState: "reconnecting",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void refetchRef.current();
        }
      }
    );

    return disconnect;
  }, [refetchRef, state.timezone, strategyFilter]);

  const effectiveStreamStatus = useMemo(
    () =>
      resolveStreamStatus({
        status: streamState,
        paused: false,
        fallbackFreshnessTimestamp: data?.items[0]?.occurredAt ?? null,
        degraded: Boolean(streamState?.degraded)
      }),
    [data?.items, streamState]
  );
  const canExport = Boolean(
    session?.effectiveCapability.allowedExportResources.some(
      (resource) => resource.resource === "skips"
    )
  );
  const exportHref = useMemo(
    () =>
      createExportHref("skips", {
        search: state.search,
        sort: state.sort,
        timezone: state.timezone,
        range: state.range,
        strategy: state.strategy?.join(","),
        symbol: state.symbol?.join(","),
        market: state.market?.join(",")
      }),
    [
      state.market,
      state.range,
      state.search,
      state.sort,
      state.strategy,
      state.symbol,
      state.timezone
    ]
  );

  if (isLoading || isFetching) {
    return <LoadingState title="Loading skips" message="Querying persisted skip diagnostics." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Skipped trades failed to load"
        message="The API could not return normalized skip diagnostics."
      />
    );
  }

  return (
    <div className="page-stack">
      <FreshnessBanner
        connectionState={effectiveStreamStatus.connectionState}
        degraded={effectiveStreamStatus.degraded}
        freshnessTimestamp={effectiveStreamStatus.freshnessTimestamp}
      />
      <ReconnectBanner
        message="The skip stream is reconnecting. Persisted skip diagnostics remain queryable."
        visible={effectiveStreamStatus.connectionState === "reconnecting"}
      />
      {effectiveStreamStatus.degraded ? (
        <DegradedStatePanel message="Skip diagnostics are being resynchronized against persisted history." />
      ) : null}
      <SearchBar
        canExport={canExport}
        exportHref={exportHref}
        onSearchChange={(value) => setState({ search: value, page: 1 })}
        onSortChange={(value) => setState({ sort: value, page: 1 })}
        resource="skips"
        search={state.search}
        sort={state.sort}
      />
      <SkipTaxonomyTable rows={data.taxonomyBreakdown} />
      {data.items.length === 0 ? (
        <EmptyState
          title="No skipped trades matched"
          message="Adjust the active search or range to view normalized skip diagnostics."
        />
      ) : (
        <>
          <Card title="Skipped trade facts" accent="neutral">
            <VirtualizedDataTable
              ariaLabel="Skipped trade facts"
              caption="Skipped trade facts"
              columns={[
                {
                  key: "correlation",
                  header: "Correlation",
                  renderCell: (row) => (
                    <span title={row.correlationId}>{formatCorrelationPreview(row.correlationId)}</span>
                  )
                },
                { key: "strategy", header: "Strategy", renderCell: (row) => row.strategyId },
                { key: "market", header: "Market", renderCell: (row) => row.marketTicker },
                { key: "category", header: "Category", renderCell: (row) => row.skipCategory },
                { key: "code", header: "Code", renderCell: (row) => row.skipCode ?? "none" },
                { key: "reason", header: "Reason", renderCell: (row) => row.reasonRaw },
                {
                  key: "occurred",
                  header: "Occurred",
                  renderCell: (row) => formatTimestamp(row.occurredAt, state.timezone)
                }
              ]}
              rowKey={(row) => `${row.correlationId}:${row.occurredAt}`}
              rows={data.items}
            />
          </Card>
          <DataTableShell
            pageInfo={data.pageInfo}
            summary="Skip diagnostics stay first-class facts and never rely on missing order inference."
            onNextPage={() => setState({ page: data.pageInfo.page + 1 })}
            onPreviousPage={() => setState({ page: Math.max(1, data.pageInfo.page - 1) })}
          >
            <span className="sr-only">Skip pagination controls</span>
          </DataTableShell>
        </>
      )}
    </div>
  );
}
