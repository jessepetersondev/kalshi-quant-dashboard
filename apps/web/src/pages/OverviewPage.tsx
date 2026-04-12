import { useEffect, useMemo, useRef, useState } from "react";

import type {
  DecisionRow,
  StreamStatusEvent,
  TradeRow
} from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { DegradedStatePanel } from "../components/state/DegradedStatePanel.js";
import { AggregatePnlCard } from "../components/overview/AggregatePnlCard.js";
import { GlobalHealthCard } from "../components/overview/GlobalHealthCard.js";
import { LiveDecisionFeed } from "../components/overview/LiveDecisionFeed.js";
import { LiveTradeFeed } from "../components/overview/LiveTradeFeed.js";
import { AlertDrawer } from "../components/alerts/AlertDrawer.js";
import { AlertLink } from "../components/alerts/AlertLink.js";
import { FeedControls } from "../components/live/FeedControls.js";
import { FreshnessBanner } from "../components/live/FreshnessBanner.js";
import { formatTimestamp } from "../features/format/dateTime.js";
import { createPauseBuffer } from "../features/live/pauseBuffer.js";
import { connectStream } from "../features/live/streamClient.js";
import { useGetOverviewQuery } from "../features/overview/overviewApi.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";

function upsertDecision(rows: readonly DecisionRow[], row: DecisionRow): DecisionRow[] {
  return [row, ...rows.filter((entry) => entry.correlationId !== row.correlationId)].slice(0, 10);
}

function upsertTrade(rows: readonly TradeRow[], row: TradeRow): TradeRow[] {
  return [row, ...rows.filter((entry) => entry.tradeAttemptKey !== row.tradeAttemptKey)].slice(
    0,
    10
  );
}

export function OverviewPage() {
  const timezone = useTimezoneQueryState();
  const { data, error, isLoading, isFetching, refetch } = useGetOverviewQuery({
    timezone: timezone.mode
  });
  const [decisionFeed, setDecisionFeed] = useState<readonly DecisionRow[]>([]);
  const [tradeFeed, setTradeFeed] = useState<readonly TradeRow[]>([]);
  const [bufferedCount, setBufferedCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamStatusEvent["payload"] | null>(null);
  const decisionBuffer = useRef(createPauseBuffer<DecisionRow>());
  const tradeBuffer = useRef(createPauseBuffer<TradeRow>());

  useEffect(() => {
    if (data) {
      setDecisionFeed(data.liveDecisionFeed);
      setTradeFeed(data.liveTradeFeed);
    }
  }, [data]);

  useEffect(() => {
    const disconnect = connectStream(
      {
        channels: ["overview", "decisions", "trades"],
        timezone: timezone.mode,
        detailLevel: "standard"
      },
      {
        onOverviewSnapshot(event) {
          if (decisionBuffer.current.isPaused || tradeBuffer.current.isPaused) {
            return;
          }

          setDecisionFeed(event.payload.liveDecisionFeed);
          setTradeFeed(event.payload.liveTradeFeed);
        },
        onDecisionUpsert(event) {
          if (decisionBuffer.current.isPaused) {
            decisionBuffer.current.push(event.payload.row);
            setBufferedCount(
              decisionBuffer.current.buffered.length + tradeBuffer.current.buffered.length
            );
            return;
          }

          setDecisionFeed((current) => upsertDecision(current, event.payload.row));
        },
        onTradeUpsert(event) {
          if (tradeBuffer.current.isPaused) {
            tradeBuffer.current.push(event.payload.row);
            setBufferedCount(
              decisionBuffer.current.buffered.length + tradeBuffer.current.buffered.length
            );
            return;
          }

          setTradeFeed((current) => upsertTrade(current, event.payload.row));
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
            degraded: Boolean(data?.healthSummary.degraded),
            reconciliationPending: true
          });
          void refetch();
        }
      }
    );

    return disconnect;
  }, [data?.healthSummary.degraded, refetch, timezone.mode]);

  const effectiveStreamState = useMemo<StreamStatusEvent["payload"]>(
    () =>
      streamState ?? {
        connectionState: data?.healthSummary.degraded ? "degraded" : "connected",
        freshnessTimestamp: data?.healthSummary.freshnessTimestamp ?? data?.generatedAt ?? new Date(0).toISOString(),
        degraded: Boolean(data?.healthSummary.degraded),
        reconciliationPending: false
      },
    [data?.generatedAt, data?.healthSummary.degraded, data?.healthSummary.freshnessTimestamp, streamState]
  );

  if (isLoading || isFetching) {
    return <LoadingState title="Loading overview" message="Querying live health and portfolio state." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Overview failed to load"
        message="The dashboard could not load the overview snapshot from the API."
      />
    );
  }

  if (
    decisionFeed.length === 0 &&
    tradeFeed.length === 0 &&
    data.queueSummary.length === 0 &&
    data.recentAlerts.length === 0
  ) {
    return (
      <EmptyState
        title="No overview facts yet"
        message="The system is seeded but no live or historical overview facts are currently available."
      />
    );
  }

  return (
    <div className="page-stack">
      <FreshnessBanner
        connectionState={paused ? "paused" : effectiveStreamState.connectionState}
        freshnessTimestamp={effectiveStreamState.freshnessTimestamp}
        degraded={effectiveStreamState.degraded}
      />
      {data.healthSummary.degraded ? (
        <DegradedStatePanel message="One or more upstream components are degraded. Recent alerts and queue state remain visible." />
      ) : null}
      <div className="toolbar-row">
        <FeedControls
          paused={paused}
          bufferedCount={bufferedCount}
          onToggle={() => {
            if (paused) {
              const bufferedDecisions = decisionBuffer.current.resume();
              const bufferedTrades = tradeBuffer.current.resume();
              setPaused(false);
              setBufferedCount(0);
              if (bufferedDecisions.length > 0) {
                setDecisionFeed((current) =>
                  bufferedDecisions.reduce((rows, row) => upsertDecision(rows, row), current)
                );
              }
              if (bufferedTrades.length > 0) {
                setTradeFeed((current) =>
                  bufferedTrades.reduce((rows, row) => upsertTrade(rows, row), current)
                );
              }
              return;
            }

            decisionBuffer.current.pause();
            tradeBuffer.current.pause();
            setPaused(true);
          }}
        />
      </div>
      <div className="metric-grid">
        <GlobalHealthCard
          status={data.healthSummary.status}
          freshnessTimestamp={formatTimestamp(data.healthSummary.freshnessTimestamp, timezone.mode)}
          degraded={data.healthSummary.degraded}
        />
        <AggregatePnlCard pnl={data.aggregatePnl} />
      </div>
      <div className="split-grid">
        <LiveDecisionFeed rows={decisionFeed} timezone={timezone.mode} />
        <LiveTradeFeed rows={tradeFeed} timezone={timezone.mode} />
      </div>
      <div className="split-grid">
        <Card title="Queue Health" accent="neutral">
          <div className="timeline-list">
            {data.queueSummary.map((row) => (
              <div className="timeline-item" key={`${row.queueName}:${row.sampledAt}`}>
                <div className="detail-header">
                  <strong>{row.queueName}</strong>
                  <span className="muted">{row.reconnectStatus ?? "connected"}</span>
                </div>
                <div className="muted">
                  messages {row.messageCount} · consumers {row.consumerCount}
                </div>
                <div className="muted">
                  oldest age {row.oldestMessageAgeSeconds ?? 0}s · DLQ {row.dlqMessageCount ?? 0}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent Alerts" accent="neutral">
          <div className="timeline-list">
            {data.recentAlerts.map((row) => (
              <div className="timeline-item" key={row.alertId}>
                <div className="detail-header">
                  <AlertLink
                    alertId={row.alertId}
                    label={row.summary}
                    onOpen={setSelectedAlertId}
                  />
                  <span className="muted">{row.severity}</span>
                </div>
                <div className="muted">{row.alertType}</div>
                <div className="muted">
                  {formatTimestamp(row.latestSeenAt, timezone.mode)}
                </div>
              </div>
            ))}
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
