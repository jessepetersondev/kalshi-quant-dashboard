import { sourceProfiles, type SourceObservationInput } from "@kalshi-quant-dashboard/source-adapters";

import { SourceIngestService } from "../../services/source-ingest-service.js";
import { RabbitMqSourceConsumer } from "../../runtime/rabbitmq-source-consumer.js";

export interface RabbitMqDeliveryMetadata {
  readonly exchange?: string;
  readonly queue?: string;
  readonly routingKey?: string;
  readonly deliveryTag?: number | string;
  readonly redelivered?: boolean;
  readonly sourceSequence?: number | string;
  readonly sourceDeliveryOrdinal?: number;
}

export interface PublisherConsumerOptions {
  readonly name: string;
  readonly url: string;
  readonly queue: string;
  readonly sourceProfile:
    | typeof sourceProfiles.publisherEnvelopeV1
    | typeof sourceProfiles.publisherResultV1;
  readonly sourceRepo: string;
  readonly ingestService?: SourceIngestService;
}

export class PublisherConsumer {
  readonly name: string;

  private readonly ingestService: SourceIngestService;
  private readonly runtimeConsumer?: RabbitMqSourceConsumer;

  constructor(options?: PublisherConsumerOptions) {
    this.ingestService = options?.ingestService ?? new SourceIngestService();
    this.name = options?.name ?? "publisher-envelope-consumer";

    if (options) {
      this.runtimeConsumer = new RabbitMqSourceConsumer({
        name: options.name,
        url: options.url,
        queue: options.queue,
        sourceProfile: options.sourceProfile,
        sourceRepo: options.sourceRepo,
        sourceIngestService: this.ingestService
      });
    }
  }

  async consume(
    payload: Record<string, unknown>,
    metadata: RabbitMqDeliveryMetadata = {}
  ): Promise<ReturnType<SourceIngestService["ingest"]>> {
    const input: SourceObservationInput = {
      sourceProfile: sourceProfiles.publisherEnvelopeV1,
      sourceRepo: "kalshi-integration-event-publisher",
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
