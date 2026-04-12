type SkipCategory =
  | "market_conditions"
  | "risk_guardrail"
  | "position_state"
  | "timing_window"
  | "configuration"
  | "infrastructure"
  | "data_quality"
  | "operator_control"
  | "other";

function classifyReason(reasonRaw: string): { skipCategory: SkipCategory; skipCode: string | null } {
  const reason = reasonRaw.trim().toLowerCase();

  if (reason.includes("cooldown")) {
    return { skipCategory: "timing_window", skipCode: "cooldown_active" };
  }

  if (
    reason.includes("open live order") ||
    reason.includes("open order") ||
    reason.includes("already holding")
  ) {
    return { skipCategory: "position_state", skipCode: "existing_position_or_order" };
  }

  if (reason.includes("risk") || reason.includes("guardrail") || reason.includes("limit")) {
    return { skipCategory: "risk_guardrail", skipCode: "risk_limit" };
  }

  if (reason.includes("expiry") || reason.includes("window")) {
    return { skipCategory: "timing_window", skipCode: "expiry_window" };
  }

  if (reason.includes("disabled") || reason.includes("config") || reason.includes("halt")) {
    return { skipCategory: "configuration", skipCode: "strategy_configuration" };
  }

  if (
    reason.includes("queue") ||
    reason.includes("publisher") ||
    reason.includes("executor") ||
    reason.includes("rabbit")
  ) {
    return { skipCategory: "infrastructure", skipCode: "pipeline_unavailable" };
  }

  if (
    reason.includes("stale") ||
    reason.includes("missing") ||
    reason.includes("no side passed gate")
  ) {
    return { skipCategory: "data_quality", skipCode: "insufficient_signal" };
  }

  if (reason.includes("operator")) {
    return { skipCategory: "operator_control", skipCode: "operator_override" };
  }

  if (
    reason.includes("spread") ||
    reason.includes("liquidity") ||
    reason.includes("price band") ||
    reason.includes("market")
  ) {
    return { skipCategory: "market_conditions", skipCode: "market_gate" };
  }

  return { skipCategory: "other", skipCode: null };
}

function buildBasePayload(
  row: Record<string, unknown>,
  reasonRaw: string
): Record<string, unknown> {
  const classification = classifyReason(reasonRaw);

  return {
    ...row,
    reasonRaw,
    skipCategory: classification.skipCategory,
    skipCode: classification.skipCode
  };
}

export function normalizeRuntimeSkipDecision(
  row: Record<string, unknown>
): Record<string, unknown> {
  return buildBasePayload(row, String(row.reason ?? row.reasonRaw ?? "skip"));
}

export function normalizeDashboardSkipRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  return buildBasePayload(row, String(row.reason ?? row.reasonRaw ?? "skip"));
}

export function normalizeSkipReason(reasonRaw: string): {
  skipCategory: SkipCategory;
  skipCode: string | null;
  reasonRaw: string;
} {
  return {
    ...classifyReason(reasonRaw),
    reasonRaw
  };
}
