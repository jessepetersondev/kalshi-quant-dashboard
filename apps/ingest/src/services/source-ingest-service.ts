import type { SourceObservationInput } from "@kalshi-quant-dashboard/source-adapters";

import { normalizeObservation } from "../normalization/normalize-observation.js";
import { AlertRuleLoader } from "../alerts/alert-rule-loader.js";
import { AlertEvaluator } from "../alerts/alert-evaluator.js";
import { ConvergenceService } from "../reconciliation/convergence-service.js";
import { upsertProjectedAlert } from "../projections/alert-projector.js";
import { CheckpointService } from "./checkpoint-service.js";
import { DedupService } from "./dedup-service.js";
import { PnlReconciliationService } from "./pnl-reconciliation-service.js";

export class SourceIngestService {
  constructor(
    private readonly dedupService = new DedupService(),
    private readonly checkpointService = new CheckpointService(),
    private readonly convergenceService = new ConvergenceService(),
    private readonly pnlReconciliationService = new PnlReconciliationService(),
    private readonly alertRuleLoader = new AlertRuleLoader(),
    private readonly alertEvaluator = new AlertEvaluator()
  ) {}

  async ingest(input: SourceObservationInput): Promise<{
    insertedFacts: number;
    duplicateObservations: number;
  }> {
    const bundle = normalizeObservation(input);
    const result = await this.dedupService.persist(bundle.entries);
    await this.runDerivedSideEffects(bundle.entries);
    await this.checkpointService.saveCheckpoint({
      checkpointKey: `${input.sourceRepo}:${input.sourceProfile.sourceVariant}`,
      projectionCursor: bundle.entries.at(-1)?.event.canonicalEventId,
      metadata: { count: bundle.entries.length }
    });

    return result;
  }

  sortForReplay(events: readonly ReturnType<typeof normalizeObservation>["entries"][number]["event"][]) {
    return this.convergenceService.sortTimeline(events);
  }

  async reconcileMissingTerminalEvents(): Promise<number> {
    return this.convergenceService.reconcileMissingTerminalEvents();
  }

  private async runDerivedSideEffects(entries: readonly ReturnType<typeof normalizeObservation>["entries"][number][]) {
    const strategyIds = [
      ...new Set(
        entries
          .map((entry) => entry.event.strategyId)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    ];
    if (strategyIds.length > 0) {
      await this.pnlReconciliationService.reconcileStrategies(strategyIds);
    }

    const alertRules = await this.alertRuleLoader.load();
    for (const entry of entries) {
      if (entry.event.canonicalFamily === "queue_metric") {
        const payload = entry.event.normalizedPayload;
        const backlogRule = alertRules.find(
          (rule) =>
            rule.alertType === "queue_backlog_age" &&
            (rule.scopeKey === "*" || rule.scopeKey === String(payload.queueName))
        );
        if (backlogRule) {
          const evaluation = this.alertEvaluator.evaluate(backlogRule, {
            value: Number(payload.oldestMessageAgeMs ?? 0)
          });
          if (evaluation.triggered) {
            await upsertProjectedAlert({
              alertId: `queue-backlog:${String(payload.queueName)}`,
              alertType: "queue_backlog_age",
              severity: evaluation.severity,
              status: "open",
              summary: "Queue backlog age exceeded threshold",
              detail: `Oldest message age is ${Number(payload.oldestMessageAgeMs ?? 0)}ms.`,
              affectedComponent: String(payload.queueName),
              sourceCanonicalEventId: entry.event.canonicalEventId,
              metadata: payload,
              seenAt: entry.event.occurredAt
            });
          }
        }

        const dlqRule = alertRules.find(
          (rule) =>
            rule.alertType === "dlq_growth" &&
            (rule.scopeKey === "*" || rule.scopeKey === String(payload.queueName))
        );
        if (dlqRule) {
          const evaluation = this.alertEvaluator.evaluate(dlqRule, {
            value: Number(payload.deadLetterGrowth ?? 0)
          });
          if (evaluation.triggered) {
            await upsertProjectedAlert({
              alertId: `dlq-growth:${String(payload.queueName)}`,
              alertType: "dlq_growth",
              severity: evaluation.severity,
              status: "open",
              summary: "DLQ growth detected",
              detail: `Dead-letter growth is ${Number(payload.deadLetterGrowth ?? 0)}.`,
              affectedComponent: String(payload.queueName),
              sourceCanonicalEventId: entry.event.canonicalEventId,
              metadata: payload,
              seenAt: entry.event.occurredAt
            });
          }
        }
      }

      if (entry.event.canonicalFamily === "heartbeat") {
        const payload = entry.event.normalizedPayload;
        if (payload.halted === true) {
          await upsertProjectedAlert({
            alertId: `heartbeat:${entry.event.sourceRepo}`,
            correlationId: entry.event.correlationId,
            strategyId: entry.event.strategyId ?? null,
            alertType: "missing_heartbeat",
            severity: "warning",
            status: "open",
            summary: `Heartbeat degraded for ${entry.event.sourceRepo}`,
            detail: `Component reported halted state.`,
            affectedComponent: entry.event.sourceRepo,
            sourceCanonicalEventId: entry.event.canonicalEventId,
            metadata: payload,
            seenAt: entry.event.occurredAt
          });
        }
      }

      if (entry.event.canonicalFamily === "pnl_snapshot" && entry.event.normalizedPayload.stale) {
        await upsertProjectedAlert({
          alertId: `stale-pnl:${entry.event.strategyId ?? entry.event.sourceRepo}`,
          correlationId: entry.event.correlationId,
          strategyId: entry.event.strategyId ?? null,
          alertType: "stale_pnl",
          severity: "warning",
          status: "open",
          summary: `PnL snapshot is stale for ${entry.event.strategyId ?? entry.event.sourceRepo}`,
          detail: "The latest PnL snapshot is marked stale by the source.",
          affectedComponent: entry.event.strategyId ?? entry.event.sourceRepo,
          sourceCanonicalEventId: entry.event.canonicalEventId,
          metadata: entry.event.normalizedPayload,
          seenAt: entry.event.occurredAt
        });
      }
    }
  }
}
