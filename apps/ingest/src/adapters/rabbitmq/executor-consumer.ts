import { sourceProfiles, type SourceObservationInput } from "@kalshi-quant-dashboard/source-adapters";

import { SourceIngestService } from "../../services/source-ingest-service.js";
import { RabbitMqSourceConsumer } from "../../runtime/rabbitmq-source-consumer.js";

export interface ExecutorDeliveryMetadata {
  readonly exchange?: string;
  readonly queue?: string;
  readonly routingKey?: string;
  readonly deliveryTag?: number | string;
  readonly redelivered?: boolean;
  readonly sourceSequence?: number | string;
  readonly sourceDeliveryOrdinal?: number;
}

export interface ExecutorConsumerOptions {
  readonly name: string;
  readonly url: string;
  readonly queue: string;
  readonly sourceRepo: string;
  readonly ingestService?: SourceIngestService;
}

export class ExecutorConsumer {
  readonly name: string;

  private readonly ingestService: SourceIngestService;
  private readonly runtimeConsumer?: RabbitMqSourceConsumer;

  constructor(options?: ExecutorConsumerOptions) {
    this.ingestService = options?.ingestService ?? new SourceIngestService();
    this.name = options?.name ?? "executor-results-consumer";

    if (options) {
      this.runtimeConsumer = new RabbitMqSourceConsumer({
        name: options.name,
        url: options.url,
        queue: options.queue,
        sourceProfile: sourceProfiles.standaloneExecutorV1,
        sourceRepo: options.sourceRepo,
        sourceIngestService: this.ingestService
      });
    }
  }

  async consume(
    payload: Record<string, unknown>,
    metadata: ExecutorDeliveryMetadata = {}
  ): Promise<ReturnType<SourceIngestService["ingest"]>> {
    const input: SourceObservationInput = {
      sourceProfile: sourceProfiles.standaloneExecutorV1,
      sourceRepo: "kalshi-integration-executor",
      payload,
      metadata: { ...metadata }
    };

    return this.ingestService.ingest(input);
  }

  async start(): Promise<void> {
    await this.runtimeConsumer?.start();
  }

  async stop(): Promise<void> {
    await this.runtimeConsumer?.stop();
  }
}
