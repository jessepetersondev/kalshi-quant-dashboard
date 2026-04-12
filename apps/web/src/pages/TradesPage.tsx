import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StreamStatusEvent, TradeRow } from "@kalshi-quant-dashboard/contracts";

import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { FeedControls } from "../components/live/FeedControls.js";
import { FreshnessBanner } from "../components/live/FreshnessBanner.js";
import { SearchBar } from "../components/lifecycle/SearchBar.js";
import { TradeDrawer } from "../components/lifecycle/TradeDrawer.js";
import { TradeTable } from "../components/lifecycle/TradeTable.js";
import { DataTableShell } from "../components/table/DataTableShell.js";
import { createExportHref } from "../features/exports/exportClient.js";
import { createPauseBuffer } from "../features/live/pauseBuffer.js";
import { connectStream } from "../features/live/streamClient.js";
import { useLifecycleQueryState } from "../features/router/queryState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";
import { useGetTradeListQuery } from "../features/trades/tradesApi.js";

function upsertTradeRow(
  rows: readonly TradeRow[],
  row: TradeRow,
  sort: "newest" | "oldest",
  pageSize: number
): TradeRow[] {
  const next = [row, ...rows.filter((entry) => entry.tradeAttemptKey !== row.tradeAttemptKey)];
  next.sort((left, right) =>
    sort === "oldest"
      ? left.latestSeenAt.localeCompare(right.latestSeenAt)
      : right.latestSeenAt.localeCompare(left.latestSeenAt)
  );
  return next.slice(0, pageSize);
}

export function TradesPage() {
  const { state, setState } = useLifecycleQueryState();
  const { data: session } = useGetSessionQuery();
  const { data, error, isLoading, refetch } = useGetTradeListQuery({
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
    status: state.status,
    lifecycleStage: state.lifecycleStage
  });
  const [rows, setRows] = useState<readonly TradeRow[]>([]);
  const [bufferedCount, setBufferedCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [streamState, setStreamState] = useState<StreamStatusEvent["payload"] | null>(null);
  const pauseBuffer = useRef(createPauseBuffer<TradeRow>());
  const hasPinnedQuery = Boolean(
    state.search ||
      state.strategy?.length ||
      state.symbol?.length ||
      state.market?.length ||
      state.status?.length ||
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
        channels: ["trades"],
        timezone: state.timezone,
        detailLevel: "standard",
        ...(state.strategy?.length ? { strategy: state.strategy } : {})
      },
      {
        onTradeUpsert(event) {
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
            upsertTradeRow(current, event.payload.row, state.sort, state.pageSize)
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
    freshnessTimestamp: rows[0]?.latestSeenAt ?? new Date().toISOString(),
    degraded: false,
    reconciliationPending: false
  };
  const canExport = Boolean(
    session?.effectiveCapability.allowedExportResources.some(
      (resource) => resource.resource === "trades"
    )
  );
  const exportHref = useMemo(
    () =>
      createExportHref("trades", {
        search: state.search,
        sort: state.sort,
        timezone: state.timezone,
        range: state.range,
        strategy: state.strategy?.join(","),
        symbol: state.symbol?.join(","),
        market: state.market?.join(","),
        status: state.status?.join(","),
        lifecycleStage: state.lifecycleStage?.join(",")
      }),
    [
      state.lifecycleStage,
      state.market,
      state.range,
      state.search,
      state.sort,
      state.status,
      state.strategy,
      state.symbol,
      state.timezone
    ]
  );
  const handleOpenDetail = useCallback(
    (correlationId: string) => {
      setState({ detail: correlationId });
    },
    [setState]
  );

  if (isLoading && !data) {
    return <LoadingState title="Loading trades" message="Querying trade lifecycle rows." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Trades failed to load"
        message="The trade lifecycle query did not complete successfully."
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
                  (nextRows, row) => upsertTradeRow(nextRows, row, state.sort, state.pageSize),
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
        resource="trades"
        search={state.search}
        sort={state.sort}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No trades matched"
          message="Adjust the search or filters to return trade lifecycle rows."
        />
      ) : (
        <>
          <DataTableShell
            pageInfo={data.pageInfo}
            summary="Trade attempts are paginated server-side and merged with live status updates."
            title="Trade lifecycle"
            onNextPage={() => setState({ page: data.pageInfo.page + 1 })}
            onPreviousPage={() => setState({ page: Math.max(1, data.pageInfo.page - 1) })}
          >
            <TradeTable
              onOpenDetail={handleOpenDetail}
              rows={rows}
              timezone={state.timezone}
            />
          </DataTableShell>
        </>
      )}
      <TradeDrawer
        correlationId={state.detail}
        onClose={() => setState({ detail: null })}
        timezone={state.timezone}
      />
    </div>
  );
}
