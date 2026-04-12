import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DecisionRow, StreamStatusEvent } from "@kalshi-quant-dashboard/contracts";

import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { FeedControls } from "../components/live/FeedControls.js";
import { FreshnessBanner } from "../components/live/FreshnessBanner.js";
import { DecisionTable } from "../components/lifecycle/DecisionTable.js";
import { SearchBar } from "../components/lifecycle/SearchBar.js";
import { DecisionDrawer } from "../components/lifecycle/DecisionDrawer.js";
import { DataTableShell } from "../components/table/DataTableShell.js";
import { createExportHref } from "../features/exports/exportClient.js";
import { createPauseBuffer } from "../features/live/pauseBuffer.js";
import { connectStream } from "../features/live/streamClient.js";
import { useLifecycleQueryState } from "../features/router/queryState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";
import { useGetDecisionListQuery } from "../features/decisions/decisionsApi.js";

function upsertDecisionRow(
  rows: readonly DecisionRow[],
  row: DecisionRow,
  sort: "newest" | "oldest",
  pageSize: number
): DecisionRow[] {
  const next = [row, ...rows.filter((entry) => entry.correlationId !== row.correlationId)];
  next.sort((left, right) =>
    sort === "oldest"
      ? left.latestEventAt.localeCompare(right.latestEventAt)
      : right.latestEventAt.localeCompare(left.latestEventAt)
  );
  return next.slice(0, pageSize);
}

export function DecisionsPage() {
  const { state, setState } = useLifecycleQueryState();
  const { data: session } = useGetSessionQuery();
  const { data, error, isLoading, refetch } = useGetDecisionListQuery({
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    search: state.search || undefined,
    timezone: state.timezone,
    range: state.range,
    detailLevel: "standard",
    strategy: state.strategy,
    symbol: state.symbol,
    market: state.market,
    lifecycleStage: state.lifecycleStage
  });
  const [rows, setRows] = useState<readonly DecisionRow[]>([]);
  const [bufferedCount, setBufferedCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [streamState, setStreamState] = useState<StreamStatusEvent["payload"] | null>(null);
  const restoreFocusTargetRef = useRef<string | null>(null);
  const pauseBuffer = useRef(createPauseBuffer<DecisionRow>());
  const hasPinnedQuery = Boolean(
    state.search ||
      state.strategy?.length ||
      state.symbol?.length ||
      state.market?.length ||
      state.lifecycleStage?.length ||
      state.page > 1
  );

  useEffect(() => {
    if (data) {
      setRows(data.items);
    }
  }, [data]);

  useEffect(() => {
    const disconnect = connectStream(
      {
        channels: ["decisions"],
        timezone: state.timezone,
        detailLevel: "standard",
        ...(state.strategy?.length ? { strategy: state.strategy } : {})
      },
      {
        onDecisionUpsert(event) {
          if (pauseBuffer.current.isPaused) {
            pauseBuffer.current.push(event.payload.row);
            setBufferedCount(pauseBuffer.current.buffered.length);
            return;
          }

          if (hasPinnedQuery) {
            void refetch();
            return;
          }

          setRows((current) =>
            upsertDecisionRow(current, event.payload.row, state.sort, state.pageSize)
          );
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
            degraded: false,
            reconciliationPending: true
          });
          void refetch();
        }
      }
    );

    return disconnect;
  }, [hasPinnedQuery, refetch, state.pageSize, state.sort, state.strategy, state.timezone]);

  const effectiveStreamState = streamState ?? {
    connectionState: paused ? "paused" : "connected",
    freshnessTimestamp: rows[0]?.latestEventAt ?? new Date().toISOString(),
    degraded: false,
    reconciliationPending: false
  };
  const canExport = Boolean(
    session?.effectiveCapability.allowedExportResources.some(
      (resource) => resource.resource === "decisions"
    )
  );
  const exportHref = useMemo(
    () =>
      createExportHref("decisions", {
        search: state.search,
        sort: state.sort,
        timezone: state.timezone,
        range: state.range,
        strategy: state.strategy?.join(","),
        symbol: state.symbol?.join(","),
        market: state.market?.join(","),
        lifecycleStage: state.lifecycleStage?.join(",")
      }),
    [
      state.lifecycleStage,
      state.market,
      state.range,
      state.search,
      state.sort,
      state.strategy,
      state.symbol,
      state.timezone
    ]
  );
  const handleOpenDetail = useCallback(
    (correlationId: string, triggerId: string) => {
      restoreFocusTargetRef.current = triggerId;
      setState({ detail: correlationId });
    },
    [setState]
  );

  const handleCloseDetail = useCallback(() => {
    setState({ detail: null });

    const focusTarget = restoreFocusTargetRef.current;
    if (!focusTarget) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(focusTarget)?.focus();
      restoreFocusTargetRef.current = null;
    });
  }, [setState]);

  if (isLoading && !data) {
    return <LoadingState title="Loading decisions" message="Querying decision lifecycle rows." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Decisions failed to load"
        message="The decision lifecycle query did not complete successfully."
      />
    );
  }

  return (
    <div className="page-stack">
      <FreshnessBanner
        connectionState={paused ? "paused" : effectiveStreamState.connectionState}
        degraded={effectiveStreamState.degraded}
        freshnessTimestamp={effectiveStreamState.freshnessTimestamp}
      />
      <FeedControls
        bufferedCount={bufferedCount}
        onToggle={() => {
          if (paused) {
            const bufferedRows = pauseBuffer.current.resume();
            setPaused(false);
            setBufferedCount(0);
            if (hasPinnedQuery) {
              void refetch();
              return;
            }

            if (bufferedRows.length > 0) {
              setRows((current) =>
                bufferedRows.reduce(
                  (nextRows, row) => upsertDecisionRow(nextRows, row, state.sort, state.pageSize),
                  current
                )
              );
            }
            return;
          }

          pauseBuffer.current.pause();
          setPaused(true);
        }}
        paused={paused}
      />
      <SearchBar
        canExport={canExport}
        exportHref={exportHref}
        onSearchChange={(value) => setState({ search: value, page: 1 })}
        onSortChange={(value) => setState({ sort: value, page: 1 })}
        resource="decisions"
        search={state.search}
        sort={state.sort}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No decisions matched"
          message="Adjust the search or filters to return decision lifecycle rows."
        />
      ) : (
        <>
          <DataTableShell
            pageInfo={data.pageInfo}
            summary="Server-bounded decision history with live inserts buffered or refetched on demand."
            title="Decision lifecycle"
            onNextPage={() => setState({ page: data.pageInfo.page + 1 })}
            onPreviousPage={() => setState({ page: Math.max(1, data.pageInfo.page - 1) })}
          >
            <DecisionTable
              onOpenDetail={handleOpenDetail}
              rows={rows}
              timezone={state.timezone}
            />
          </DataTableShell>
        </>
      )}
      <DecisionDrawer
        correlationId={state.detail}
        onClose={handleCloseDetail}
        timezone={state.timezone}
      />
    </div>
  );
}
