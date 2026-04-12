import { healthProbeSchema } from "@kalshi-quant-dashboard/contracts";

export class IngestHealthState {
  private started = false;
  private lastCollectorRunAt: string | null = null;
  private lastCollectorError: string | null = null;
  private consumersReady = false;
  private consumerError: string | null = null;

  constructor(
    private readonly mode: {
      readonly collectorsEnabled: boolean;
      readonly consumersEnabled: boolean;
    }
  ) {}

  markStarted(): void {
    this.started = true;
  }

  markCollectorSuccess(): void {
    this.lastCollectorRunAt = new Date().toISOString();
    this.lastCollectorError = null;
  }

  markCollectorFailure(error: unknown): void {
    this.lastCollectorError = error instanceof Error ? error.message : "Unknown collector failure";
  }

  markConsumersReady(): void {
    this.consumersReady = true;
    this.consumerError = null;
  }

  markConsumerFailure(error: unknown): void {
    this.consumerError = error instanceof Error ? error.message : "Unknown consumer failure";
  }

  buildProbe(mode: "liveness" | "readiness") {
    const checkedAt = new Date().toISOString();

    if (mode === "liveness") {
      return {
        statusCode: 200,
        body: healthProbeSchema.parse({
          status: "ok",
          service: "ingest",
          checkedAt,
          details: {
            mode,
            started: this.started
          }
        })
      };
    }

    const collectorReady =
      !this.mode.collectorsEnabled || (this.lastCollectorRunAt !== null && !this.lastCollectorError);
    const consumerReady =
      !this.mode.consumersEnabled || (this.consumersReady && !this.consumerError);
    const ready = this.started && collectorReady && consumerReady;

    return {
      statusCode: ready ? 200 : 503,
      body: healthProbeSchema.parse({
        status: ready ? "ok" : "degraded",
        service: "ingest",
        checkedAt,
        details: {
          mode,
          collectorsEnabled: this.mode.collectorsEnabled,
          consumersEnabled: this.mode.consumersEnabled,
          lastCollectorRunAt: this.lastCollectorRunAt,
          lastCollectorError: this.lastCollectorError,
          consumersReady: this.consumersReady,
          consumerError: this.consumerError
        }
      })
    };
  }
}
