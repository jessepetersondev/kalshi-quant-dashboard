import type { AlertDetailResponse } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";
import {
  selectRawPayloadViewState,
  sortTimelineItemsForDisplay
} from "../../features/lifecycle/selectors.js";
import { RawPayloadPanel } from "../lifecycle/RawPayloadPanel.js";
import { VisibilityOmissionNotice } from "../lifecycle/VisibilityOmissionNotice.js";

export function AlertDetailPanel(props: {
  readonly detail: AlertDetailResponse;
  readonly timezone: "utc" | "local";
}) {
  const timeline = sortTimelineItemsForDisplay(props.detail.timeline);
  const rawPayloadViewState = selectRawPayloadViewState({
    canViewRawPayloads: props.detail.rawPayloadAvailable,
    rawPayloadAvailable: Boolean(props.detail.rawPayloads?.length)
  });

  return (
    <div className="detail-columns">
      <Card title="Alert summary">
        <div className="detail-header">
          <div>
            <strong>{props.detail.summary.summary}</strong>
            <div className="muted">{props.detail.summary.alertType}</div>
          </div>
          <span className="muted">{props.detail.summary.severity}</span>
        </div>
        <div className="session-meta">
          <span>Status {props.detail.summary.status}</span>
          <span>Component {props.detail.summary.affectedComponent}</span>
          <span>
            First seen {formatTimestamp(props.detail.summary.firstSeenAt, props.timezone)}
          </span>
          <span>
            Last seen {formatTimestamp(props.detail.summary.latestSeenAt, props.timezone)}
          </span>
        </div>
        <p className="muted">{props.detail.summary.detail}</p>
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
                {formatTimestamp(item.occurredAt, props.timezone)}
              </div>
              {item.degradedReasons.length > 0 ? (
                <div className="muted">{item.degradedReasons.join(", ")}</div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Audit">
        <div className="timeline-list">
          {props.detail.auditEntries.map((entry) => (
            <div className="timeline-item" key={entry.auditLogId}>
              <div className="detail-header">
                <strong>{entry.action}</strong>
                <span className="muted">{entry.result}</span>
              </div>
              <div className="muted">{entry.actorUserId}</div>
              <div className="muted">
                {formatTimestamp(entry.occurredAt, props.timezone)}
              </div>
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
