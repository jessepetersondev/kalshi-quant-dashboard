import type { DecisionRow, EventTimelineItem, TradeRow } from "@kalshi-quant-dashboard/contracts";

function compareMaybeNumeric(left: string | number | undefined, right: string | number | undefined) {
  if (left === undefined || right === undefined) {
    return 0;
  }

  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right));
}

export function sortTimelineItemsForDisplay(
  items: readonly EventTimelineItem[]
): EventTimelineItem[] {
  return [...items].sort((left, right) => {
    const occurred = left.occurredAt.localeCompare(right.occurredAt);
    if (occurred !== 0) {
      return occurred;
    }

    const sequence = compareMaybeNumeric(
      left.ordering.sourceSequence as string | number | undefined,
      right.ordering.sourceSequence as string | number | undefined
    );
    if (sequence !== 0) {
      return sequence;
    }

    const published = (left.publishedAt ?? "").localeCompare(right.publishedAt ?? "");
    if (published !== 0) {
      return published;
    }

    const firstSeen = left.firstSeenAt.localeCompare(right.firstSeenAt);
    if (firstSeen !== 0) {
      return firstSeen;
    }

    return left.canonicalEventId.localeCompare(right.canonicalEventId);
  });
}

export function buildLifecycleSearchIndex(
  decision: DecisionRow | null,
  trade: TradeRow | null,
  aliases: readonly string[]
): string {
  return [
    decision?.correlationId,
    decision?.strategyId,
    decision?.symbol,
    decision?.marketTicker,
    decision?.decisionAction,
    decision?.reasonSummary,
    trade?.tradeAttemptKey,
    trade?.status,
    trade?.publishStatus ?? undefined,
    trade?.lastResultStatus ?? undefined,
    ...aliases
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.toLowerCase())
    .join(" ");
}

export function matchesIdentifierSearch(haystack: string, search: string): boolean {
  return haystack.includes(search.trim().toLowerCase());
}

export function selectRawPayloadViewState(args: {
  readonly canViewRawPayloads: boolean;
  readonly rawPayloadAvailable: boolean;
}): {
  readonly canShowPanel: boolean;
  readonly showOmissionNotice: boolean;
} {
  if (!args.canViewRawPayloads || !args.rawPayloadAvailable) {
    return {
      canShowPanel: false,
      showOmissionNotice: true
    };
  }

  return {
    canShowPanel: true,
    showOmissionNotice: false
  };
}
