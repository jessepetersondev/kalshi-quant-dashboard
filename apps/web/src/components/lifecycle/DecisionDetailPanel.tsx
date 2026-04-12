import type { DecisionDetailResponse } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";
import { selectRawPayloadViewState, sortTimelineItemsForDisplay } from "../../features/lifecycle/selectors.js";
import { TimelineLatencyBadge } from "./TimelineLatencyBadge.js";
import { VisibilityOmissionNotice } from "./VisibilityOmissionNotice.js";
import { RawPayloadPanel } from "./RawPayloadPanel.js";

export function DecisionDetailPanel(props: {
  readonly detail: DecisionDetailResponse;
  readonly timezone: "utc" | "local";
}) {
  const timeline = sortTimelineItemsForDisplay(props.detail.timeline);
  const rawPayloadViewState = selectRawPayloadViewState({
    canViewRawPayloads: props.detail.rawPayloadAvailable,
    rawPayloadAvailable: Boolean(props.detail.rawPayloads?.length)
  });

  return (
    <div className="detail-columns">
      <Card title="Decision summary">
        <div className="detail-header">
          <div>
            <strong>{props.detail.summary.marketTicker}</strong>
            <div className="muted">{props.detail.summary.reasonSummary ?? "no reason"}</div>
          </div>
          <TimelineLatencyBadge timestamp={props.detail.summary.latestEventAt} />
        </div>
        <div className="session-meta">
          <span>Correlation: {props.detail.summary.correlationId}</span>
          <span>Lifecycle: {props.detail.summary.currentLifecycleStage}</span>
          <span>
            Latest event: {formatTimestamp(props.detail.summary.latestEventAt, props.timezone)}
          </span>
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
              {item.degradedReasons.length > 0 ? (
                <div className="muted">degraded: {item.degradedReasons.join(", ")}</div>
              ) : null}
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
