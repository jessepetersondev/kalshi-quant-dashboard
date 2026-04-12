import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import amqplib from "amqplib";

export interface RabbitMqConsumerOptions {
  readonly url: string;
  readonly queue: string;
  readonly prefetch?: number;
}

export type RabbitMqMessageHandler = (
  message: ConsumeMessage,
  channel: Channel
) => Promise<void>;

export class RabbitMqConsumer {
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;

  constructor(private readonly options: RabbitMqConsumerOptions) {}

  async start(handler: RabbitMqMessageHandler): Promise<void> {
    const connection = await amqplib.connect(this.options.url);
    const channel = await connection.createChannel();

    this.connection = connection;
    this.channel = channel;

    await channel.assertQueue(this.options.queue, { durable: true });
    await channel.prefetch(this.options.prefetch ?? 1);
    await channel.consume(this.options.queue, async (message) => {
      if (!message) {
        return;
      }

      try {
        await handler(message, channel);
        channel.ack(message);
      } catch (error) {
        channel.nack(message, false, false);
        throw error;
      }
    });
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = undefined;
    this.connection = undefined;
  }
}
