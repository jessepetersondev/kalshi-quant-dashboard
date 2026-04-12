import type {
  AlertUpsertEvent,
  DecisionUpsertEvent,
  OverviewSnapshotEvent,
  PnlUpsertEvent,
  QueueMetricUpsertEvent,
  SkipUpsertEvent,
  StreamGapEvent,
  StreamResyncRequiredEvent,
  StreamStatusEvent,
  TradeUpsertEvent
} from "@kalshi-quant-dashboard/contracts";
import {
  alertUpsertEventSchema,
  decisionUpsertEventSchema,
  overviewSnapshotEventSchema,
  pnlUpsertEventSchema,
  queueMetricUpsertEventSchema,
  skipUpsertEventSchema,
  streamGapEventSchema,
  streamResyncRequiredEventSchema,
  streamStatusEventSchema,
  tradeUpsertEventSchema
} from "@kalshi-quant-dashboard/contracts";

export interface StreamHandlers {
  readonly onOverviewSnapshot?: (event: OverviewSnapshotEvent) => void;
  readonly onDecisionUpsert?: (event: DecisionUpsertEvent) => void;
  readonly onTradeUpsert?: (event: TradeUpsertEvent) => void;
  readonly onSkipUpsert?: (event: SkipUpsertEvent) => void;
  readonly onPnlUpsert?: (event: PnlUpsertEvent) => void;
  readonly onQueueMetricUpsert?: (event: QueueMetricUpsertEvent) => void;
  readonly onAlertUpsert?: (event: AlertUpsertEvent) => void;
  readonly onStatus?: (event: StreamStatusEvent) => void;
  readonly onGap?: (event: StreamGapEvent) => void;
  readonly onResyncRequired?: (event: StreamResyncRequiredEvent) => void;
  readonly onError?: () => void;
}

function buildQuery(args: {
  readonly channels: readonly string[];
  readonly timezone: "utc" | "local";
  readonly detailLevel: "standard" | "debug";
  readonly strategy?: readonly string[];
  readonly compare?: readonly string[];
}): string {
  const search = new URLSearchParams();
  search.set("channels", args.channels.join(","));
  search.set("timezone", args.timezone);
  search.set("detailLevel", args.detailLevel);
  if (args.strategy?.length) {
    search.set("strategy", args.strategy.join(","));
  }
  if (args.compare?.length) {
    search.set("compare", args.compare.join(","));
  }

  return search.toString();
}

function parseData<T>(event: MessageEvent<string>, parser: { parse(value: unknown): T }): T {
  return parser.parse(JSON.parse(event.data) as unknown);
}

export function connectStream(
  args: {
    readonly channels: readonly string[];
    readonly timezone: "utc" | "local";
    readonly detailLevel: "standard" | "debug";
    readonly strategy?: readonly string[];
    readonly compare?: readonly string[];
  },
  handlers: StreamHandlers
): () => void {
  const stream = new EventSource(`/api/live/stream?${buildQuery(args)}`, {
    withCredentials: true
  });

  stream.addEventListener("overview.snapshot", (event) => {
    handlers.onOverviewSnapshot?.(
      parseData(event as MessageEvent<string>, overviewSnapshotEventSchema)
    );
  });
  stream.addEventListener("decision.upsert", (event) => {
    handlers.onDecisionUpsert?.(
      parseData(event as MessageEvent<string>, decisionUpsertEventSchema)
    );
  });
  stream.addEventListener("trade.upsert", (event) => {
    handlers.onTradeUpsert?.(
      parseData(event as MessageEvent<string>, tradeUpsertEventSchema)
    );
  });
  stream.addEventListener("skip.upsert", (event) => {
    handlers.onSkipUpsert?.(
      parseData(event as MessageEvent<string>, skipUpsertEventSchema)
    );
  });
  stream.addEventListener("pnl.upsert", (event) => {
    handlers.onPnlUpsert?.(
      parseData(event as MessageEvent<string>, pnlUpsertEventSchema)
    );
  });
  stream.addEventListener("queue_metric.upsert", (event) => {
    handlers.onQueueMetricUpsert?.(
      parseData(event as MessageEvent<string>, queueMetricUpsertEventSchema)
    );
  });
  stream.addEventListener("alert.upsert", (event) => {
    handlers.onAlertUpsert?.(
      parseData(event as MessageEvent<string>, alertUpsertEventSchema)
    );
  });
  stream.addEventListener("stream.status", (event) => {
    handlers.onStatus?.(parseData(event as MessageEvent<string>, streamStatusEventSchema));
  });
  stream.addEventListener("stream.gap", (event) => {
    handlers.onGap?.(parseData(event as MessageEvent<string>, streamGapEventSchema));
  });
  stream.addEventListener("stream.resync_required", (event) => {
    handlers.onResyncRequired?.(
      parseData(event as MessageEvent<string>, streamResyncRequiredEventSchema)
    );
  });
  stream.onerror = () => {
    handlers.onError?.();
  };

  return () => {
    stream.close();
  };
}
