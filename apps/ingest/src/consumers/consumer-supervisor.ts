import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

import { ExecutorConsumer } from "../adapters/rabbitmq/executor-consumer.js";
import { PublisherConsumer } from "../adapters/rabbitmq/publisher-consumer.js";
import { SourceIngestService } from "../services/source-ingest-service.js";
import { sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";

function queueWithDeadLetter(deadLetterQueue: string) {
  return {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": deadLetterQueue
    }
  } as const;
}

export interface RuntimeConsumer {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class ConsumerSupervisor {
  readonly consumers: readonly RuntimeConsumer[];

  constructor(sourceIngestService: SourceIngestService, runtimeConfig = createRuntimeConfig()) {
    this.consumers = [
      new PublisherConsumer({
        name: "publisher-envelope-consumer",
        url: runtimeConfig.env.RABBITMQ_URL,
        queue: "kalshi.integration.executor",
        queueOptions: queueWithDeadLetter("kalshi.integration.executor.dlq"),
        sourceProfile: sourceProfiles.publisherEnvelopeV1,
        sourceRepo: "kalshi-integration-event-publisher",
        ingestService: sourceIngestService
      }),
      new PublisherConsumer({
        name: "publisher-results-consumer",
        url: runtimeConfig.env.RABBITMQ_URL,
        queue: "kalshi.integration.event-publisher.results",
        queueOptions: queueWithDeadLetter("kalshi.integration.event-publisher.results.dlq"),
        sourceProfile: sourceProfiles.publisherResultV1,
        sourceRepo: "kalshi-integration-event-publisher",
        ingestService: sourceIngestService
      }),
      new ExecutorConsumer({
        name: "executor-results-consumer",
        url: runtimeConfig.env.RABBITMQ_URL,
        queue: "kalshi.integration.executor.results",
        queueOptions: queueWithDeadLetter("kalshi.integration.executor.results.dlq"),
        sourceRepo: "kalshi-integration-executor",
        ingestService: sourceIngestService
      })
    ];
  }

  list(): readonly RuntimeConsumer[] {
    return this.consumers;
  }
}
