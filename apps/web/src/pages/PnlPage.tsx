import { useEffect, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import type { PnlBucket, StreamStatusEvent } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import type { AppDispatch, RootState } from "../app/store.js";
import { CompareModeGrid } from "../components/pnl/CompareModeGrid.js";
import { AttributionChart } from "../components/pnl/AttributionChart.js";
import { FeeBreakdown } from "../components/pnl/FeeBreakdown.js";
import { PnlSummaryCards } from "../components/pnl/PnlSummaryCards.js";
import { WinLossSummary } from "../components/pnl/WinLossSummary.js";
import { ReconnectBanner } from "../components/live/ReconnectBanner.js";
import { DegradedStatePanel } from "../components/state/DegradedStatePanel.js";
import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { formatCurrency, formatTimestamp } from "../features/format/dateTime.js";
import { createExportHref } from "../features/exports/exportClient.js";
import { connectStream } from "../features/live/streamClient.js";
import { resolveStreamStatus } from "../features/live/streamStatus.js";
import { useGetPnlSummaryQuery, useGetPnlTimeseriesQuery } from "../features/pnl/pnlApi.js";
import { setComparedStrategies, toggleComparedStrategy } from "../features/compare/compareSlice.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";
import { useGetStrategiesQuery } from "../features/strategies/strategiesApi.js";

function toDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDateTimeInput(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  return new Date(value).toISOString();
}

export function PnlPage() {
  const dispatch = useDispatch<AppDispatch>();
  const timezone = useTimezoneQueryState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [streamState, setStreamState] = useState<StreamStatusEvent["payload"] | null>(null);
  const { data: session } = useGetSessionQuery();
  const comparedStrategies = useSelector(
    (state: RootState) => state.compare.selectedStrategyIds
  );
  const bucket = (searchParams.get("bucket") ?? "24h") as PnlBucket;
  const rangeStartUtc = searchParams.get("rangeStartUtc");
  const rangeEndUtc = searchParams.get("rangeEndUtc");
  const strategiesQuery = useGetStrategiesQuery();

  useEffect(() => {
    const compare = searchParams
      .get("compare")
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    dispatch(setComparedStrategies(compare ?? []));
  }, [dispatch, searchParams]);

  const summaryQuery = useMemo(
    () => ({
      timezone: timezone.mode,
      bucket,
      rangeStartUtc: rangeStartUtc ?? undefined,
      rangeEndUtc: rangeEndUtc ?? undefined,
      compare: comparedStrategies.length > 0 ? comparedStrategies : undefined
    }),
    [bucket, comparedStrategies, rangeEndUtc, rangeStartUtc, timezone.mode]
  );
  const granularity: "hour" | "day" = bucket === "24h" ? "hour" : "day";
  const timeseriesQuery = useMemo(
    () => ({
      ...summaryQuery,
      granularity
    }),
    [granularity, summaryQuery]
  );
  const summary = useGetPnlSummaryQuery(summaryQuery);
  const timeseries = useGetPnlTimeseriesQuery(timeseriesQuery);

  useEffect(() => {
    const disconnect = connectStream(
      {
        channels: ["pnl"],
        timezone: timezone.mode,
        detailLevel: "standard",
        compare: comparedStrategies
      },
      {
        onPnlUpsert() {
          void summary.refetch();
          void timeseries.refetch();
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
          void summary.refetch();
          void timeseries.refetch();
        },
        onResyncRequired() {
          setStreamState({
            connectionState: "degraded",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void summary.refetch();
          void timeseries.refetch();
        },
        onError() {
          setStreamState({
            connectionState: "reconnecting",
            freshnessTimestamp: new Date().toISOString(),
            degraded: true,
            reconciliationPending: true
          });
          void summary.refetch();
          void timeseries.refetch();
        }
      }
    );

    return disconnect;
  }, [comparedStrategies, summary, timeseries, timezone.mode]);

  const effectiveStreamStatus = resolveStreamStatus({
    status: streamState,
    paused: false,
    fallbackFreshnessTimestamp:
      summary.data?.portfolioSummary.freshnessTimestamp ?? timeseries.data?.generatedAt ?? null,
    degraded: Boolean(
      Boolean(summary.data?.portfolioSummary.stale) ||
      Boolean(summary.data?.portfolioSummary.partial) ||
      (timeseries.data?.disagreementCount ?? 0) > 0
    )
  });
  const canExport = Boolean(
    session?.effectiveCapability.allowedExportResources.some(
      (resource) => resource.resource === "pnl"
    )
  );
  const exportHref = useMemo(
    () =>
      createExportHref("pnl", {
        timezone: timezone.mode,
        bucket,
        rangeStartUtc: rangeStartUtc ?? undefined,
        rangeEndUtc: rangeEndUtc ?? undefined,
        compare: comparedStrategies.length > 0 ? comparedStrategies.join(",") : undefined
      }),
    [bucket, comparedStrategies, rangeEndUtc, rangeStartUtc, timezone.mode]
  );

  if (
    (strategiesQuery.isLoading && !strategiesQuery.data) ||
    ((!summary.data && summary.isLoading) || (!summary.data && summary.isFetching)) ||
    ((!timeseries.data && timeseries.isLoading) ||
      (!timeseries.data && timeseries.isFetching))
  ) {
    return <LoadingState title="Loading PnL analytics" message="Computing portfolio attribution and timeseries views." />;
  }

  if (
    strategiesQuery.error ||
    summary.error ||
    timeseries.error ||
    !summary.data ||
    !timeseries.data ||
    !strategiesQuery.data
  ) {
    return (
      <ErrorState
        title="PnL analytics failed to load"
        message="The API could not return persisted PnL analytics for this session."
      />
    );
  }

  return (
    <div className="page-stack">
      <ReconnectBanner
        message="The live PnL stream is reconnecting. Historical analytics remain queryable."
        visible={effectiveStreamStatus.connectionState === "reconnecting"}
      />
      {(summary.data.portfolioSummary.stale ||
        summary.data.portfolioSummary.partial ||
        timeseries.data.disagreementCount > 0) ? (
        <DegradedStatePanel
          message="PnL includes stale, partial, or snapshot mismatch facts. All affected aggregates are explicitly flagged."
        />
      ) : null}
      <div className="toolbar-row">
        <div className="toolbar-filters">
          <div className="field">
            <label htmlFor="pnl-bucket">Range</label>
            <select
              id="pnl-bucket"
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                next.set("bucket", event.target.value);
                if (event.target.value !== "custom") {
                  next.delete("rangeStartUtc");
                  next.delete("rangeEndUtc");
                }
                setSearchParams(next);
              }}
              value={bucket}
            >
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="mtd">MTD</option>
              <option value="ytd">YTD</option>
              <option value="all-time">All-time</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {bucket === "custom" ? (
            <>
              <div className="field">
                <label htmlFor="pnl-range-start">Start UTC</label>
                <input
                  id="pnl-range-start"
                  type="datetime-local"
                  value={toDateTimeInput(rangeStartUtc)}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    const value = fromDateTimeInput(event.target.value);
                    if (value) {
                      next.set("rangeStartUtc", value);
                    } else {
                      next.delete("rangeStartUtc");
                    }
                    setSearchParams(next);
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="pnl-range-end">End UTC</label>
                <input
                  id="pnl-range-end"
                  type="datetime-local"
                  value={toDateTimeInput(rangeEndUtc)}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    const value = fromDateTimeInput(event.target.value);
                    if (value) {
                      next.set("rangeEndUtc", value);
                    } else {
                      next.delete("rangeEndUtc");
                    }
                    setSearchParams(next);
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
        <div className="toolbar-actions">
          {canExport ? (
            <a className="secondary-button" href={exportHref}>
              Export CSV
            </a>
          ) : null}
        </div>
      </div>
      <Card title="Compare mode" accent="neutral">
        <div className="pill-row">
          {strategiesQuery.data.items.map((strategy) => (
            <label key={strategy.strategyId} className="pill-row">
              <input
                checked={comparedStrategies.includes(strategy.strategyId)}
                onChange={() => {
                  const nextSelected = comparedStrategies.includes(strategy.strategyId)
                    ? comparedStrategies.filter((entry) => entry !== strategy.strategyId)
                    : [...comparedStrategies, strategy.strategyId];
                  dispatch(toggleComparedStrategy(strategy.strategyId));
                  const next = new URLSearchParams(searchParams);
                  if (nextSelected.length > 0) {
                    next.set("compare", nextSelected.join(","));
                  } else {
                    next.delete("compare");
                  }
                  setSearchParams(next);
                }}
                type="checkbox"
              />
              <span>{strategy.displayName}</span>
            </label>
          ))}
        </div>
      </Card>
      {summary.data.strategyBreakdown.length === 0 ? (
        <EmptyState
          title="No PnL facts available"
          message="No persisted PnL snapshots were returned for the selected range."
        />
      ) : (
        <>
          <PnlSummaryCards summary={summary.data} timezone={timezone.mode} />
          {summary.data.compare.length > 0 ? (
            <CompareModeGrid items={summary.data.compare} />
          ) : null}
          <div className="split-grid">
            <AttributionChart
              rows={summary.data.strategyBreakdown}
              title="By strategy"
            />
            <AttributionChart
              rows={summary.data.symbolBreakdown}
              title="By symbol"
            />
          </div>
          <div className="split-grid">
            <AttributionChart
              rows={summary.data.marketBreakdown}
              title="By market"
            />
            <FeeBreakdown rows={summary.data.strategyBreakdown} />
          </div>
          <div className="split-grid">
            <WinLossSummary summary={timeseries.data.winLossSummary} />
            <Card title="Timeseries">
              <div className="timeline-list">
                {timeseries.data.series.map((point) => (
                  <div
                    className="timeline-item"
                    key={`${point.bucketStart}:${point.bucketEnd}`}
                  >
                    <div className="detail-header">
                      <strong>
                        {formatTimestamp(point.bucketStart, timezone.mode)}
                      </strong>
                      <span>{formatCurrency(point.totalPnlNet)}</span>
                    </div>
                    <div className="muted">
                      Realized {formatCurrency(point.realizedPnlNet)} · Unrealized{" "}
                      {formatCurrency(point.unrealizedPnlNet)} · Fees{" "}
                      {formatCurrency(point.feesTotal)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
