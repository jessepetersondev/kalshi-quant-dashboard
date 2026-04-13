import type { TradeDetailResponse } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";
import { selectRawPayloadViewState, sortTimelineItemsForDisplay } from "../../features/lifecycle/selectors.js";
import { TimelineLatencyBadge } from "./TimelineLatencyBadge.js";
import { VisibilityOmissionNotice } from "./VisibilityOmissionNotice.js";
import { RawPayloadPanel } from "./RawPayloadPanel.js";

export function TradeDetailPanel(props: {
  readonly detail: TradeDetailResponse;
  readonly timezone: "utc" | "local";
}) {
  const timeline = sortTimelineItemsForDisplay(props.detail.timeline);
  const rawPayloadViewState = selectRawPayloadViewState({
    canViewRawPayloads: props.detail.rawPayloadAvailable,
    rawPayloadAvailable: Boolean(props.detail.rawPayloads?.length)
  });

  return (
    <div className="detail-columns">
      <Card title="Trade summary">
        <div className="detail-header">
          <div>
            <strong>{props.detail.summary.tradeAttemptKey}</strong>
            <div className="muted">{props.detail.summary.marketTicker}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {props.detail.publisherDashboardLink ? (
              <a
                className="linkish"
                href={props.detail.publisherDashboardLink}
                rel="noreferrer"
                target="_blank"
              >
                Open in publisher dashboard
              </a>
            ) : null}
            <TimelineLatencyBadge timestamp={props.detail.summary.latestSeenAt} />
          </div>
        </div>
        <div className="session-meta">
          <span>Correlation: {props.detail.summary.correlationId}</span>
          <span>Status: {props.detail.summary.status}</span>
          <span>Terminal: {props.detail.summary.lastResultStatus ?? "pending"}</span>
        </div>
      </Card>
      <Card title="Timeline">
        <div className="timeline-list">
          {timeline.map((item) => (
            <div className="timeline-item" key={item.canonicalEventId}>
              <div className="detail-header">
                <strong>{item.sourceEventName}</strong>
                <span className="muted">{item.lifecycleStage}</span>
              </div>
              <div className="muted">
                occurred {formatTimestamp(item.occurredAt, props.timezone)}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Fills">
        <div className="timeline-list">
          {props.detail.fills.map((fill) => (
            <div className="timeline-item" key={fill.fillFactId}>
              <strong>{fill.fillFactId}</strong>
              <div className="muted">
                qty {fill.filledQuantity} @ {fill.fillPrice ?? "n/a"}
              </div>
              <div className="muted">{formatTimestamp(fill.occurredAt, props.timezone)}</div>
            </div>
          ))}
        </div>
      </Card>
      {rawPayloadViewState.canShowPanel && props.detail.rawPayloads ? (
        <RawPayloadPanel rows={props.detail.rawPayloads} />
      ) : rawPayloadViewState.showOmissionNotice ? (
        <VisibilityOmissionNotice />
      ) : null}
    </div>
  );
}
