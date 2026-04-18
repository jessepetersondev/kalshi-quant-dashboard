import type { ConsumeMessage } from "amqplib";
import type { Options } from "amqplib";

import type { SourceProfile } from "@kalshi-quant-dashboard/source-adapters";
import type { SourceObservationInput } from "@kalshi-quant-dashboard/source-adapters";

import { RabbitMqConsumer, type RabbitMqConsumerOptions } from "../consumers/rabbitmq-consumer.js";
import type { SourceIngestService } from "../services/source-ingest-service.js";

export interface RabbitMqSourceConsumerOptions {
  readonly name: string;
  readonly url: string;
  readonly queue: string;
  readonly queueOptions?: Options.AssertQueue;
  readonly sourceProfile: SourceProfile;
  readonly sourceRepo: string;
  readonly strategyId?: string;
  readonly sourceIngestService: SourceIngestService;
}

function replayKindFromMessage(message: ConsumeMessage): SourceObservationInput["replayKind"] {
  const headerValue = message.properties.headers?.["x-kqd-replay-kind"];
  if (headerValue === "redelivery") {
    return "redelivery";
  }

  if (headerValue === "replay") {
    return "replay";
  }

  if (headerValue === "backfill") {
    return "backfill";
  }

  if (headerValue === "resync") {
    return "resync";
  }

  return message.fields.redelivered ? "redelivery" : "live";
}

export class RabbitMqSourceConsumer {
  readonly name: string;

  private readonly consumer: RabbitMqConsumer;
  private deliveryOrdinal = 0;

  constructor(private readonly options: RabbitMqSourceConsumerOptions) {
    this.name = options.name;
    const consumerOptions: RabbitMqConsumerOptions = {
      url: options.url,
      queue: options.queue
    };

    if (options.queueOptions) {
      Object.assign(consumerOptions, { queueOptions: options.queueOptions });
    }

    this.consumer = new RabbitMqConsumer(consumerOptions);
  }

  async start(): Promise<void> {
    await this.consumer.start(async (message) => {
      this.deliveryOrdinal += 1;
      const payload = JSON.parse(message.content.toString("utf8")) as unknown;
      const replayKind = replayKindFromMessage(message);
      const observation: SourceObservationInput = {
        sourceProfile: this.options.sourceProfile,
        sourceRepo: this.options.sourceRepo,
        payload,
        metadata: {
          exchange: message.fields.exchange,
          queue: this.options.queue,
          routingKey: message.fields.routingKey,
          deliveryTag: message.fields.deliveryTag,
          redelivered: message.fields.redelivered,
          sourceDeliveryOrdinal: this.deliveryOrdinal,
          sourceSequence:
            typeof message.properties.headers?.["x-source-sequence"] === "string" ||
            typeof message.properties.headers?.["x-source-sequence"] === "number"
              ? message.properties.headers["x-source-sequence"]
              : this.deliveryOrdinal
        }
      };

      if (this.options.strategyId) {
        Object.assign(observation, {
          strategyId: this.options.strategyId
        });
      }

      if (replayKind) {
        Object.assign(observation, {
          replayKind
        });
      }

      await this.options.sourceIngestService.ingest(observation);
    });
  }

  async stop(): Promise<void> {
    await this.consumer.stop();
  }
}
