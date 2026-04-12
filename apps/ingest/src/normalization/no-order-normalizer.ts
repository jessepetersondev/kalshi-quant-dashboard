import { normalizeSkipReason } from "./skip-normalizer.js";

export function normalizeNoOrderDiagnosticPayload(
  diagnostics: Record<string, unknown>
): Record<string, unknown> {
  const topReasons = Array.isArray(diagnostics.top_reasons) ? diagnostics.top_reasons : [];
  const firstReason = topReasons[0] as Record<string, unknown> | undefined;
  const reasonRaw = String(
    diagnostics.global_block_reason ??
      firstReason?.reason ??
      "no trade diagnostic"
  );
  const classification = normalizeSkipReason(reasonRaw);

  return {
    ...diagnostics,
    skipKind: "no_trade_diagnostic",
    reasonRaw,
    skipCategory: classification.skipCategory,
    skipCode: classification.skipCode
  };
}
