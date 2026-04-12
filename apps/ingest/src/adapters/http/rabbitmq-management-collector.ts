import { rabbitMqManagementQueueSchema } from "@kalshi-quant-dashboard/contracts";
import { sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";

import type { CollectorHandle } from "../../collectors/collector-runner.js";
import { HttpSourceCollector } from "../../runtime/http-source-collector.js";
import type { SourceIngestService } from "../../services/source-ingest-service.js";

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function buildRabbitMqManagementCollector(args: {
  readonly baseUrl: string;
  readonly sourceIngestService: SourceIngestService;
}): CollectorHandle {
  const queueGrowth = new Map<string, number>();

  return new HttpSourceCollector({
    name: "rabbitmq-management-queues",
    url: joinUrl(args.baseUrl, "/queues"),
    sourceProfile: sourceProfiles.rabbitMqManagementV1,
    sourceRepo: "rabbitmq-management",
    sourceIngestService: args.sourceIngestService,
    transform: (payload, receivedAt) => {
      if (!Array.isArray(payload)) {
        return [];
      }

      return payload
        .map((queue) => rabbitMqManagementQueueSchema.parse(queue))
        .filter((queue) => queue.name.startsWith("kalshi.integration."))
        .map((queue) => {
          const previousCount = queueGrowth.get(queue.name) ?? 0;
          queueGrowth.set(queue.name, queue.messages);
          const idleSince = queue.idle_since ? new Date(queue.idle_since).valueOf() : null;

          return {
            capturedAt: receivedAt,
            queueName: queue.name,
            messageCount: queue.messages,
            consumerCount: queue.consumers,
            oldestMessageAgeMs:
              idleSince && queue.messages > 0 ? Math.max(0, Date.now() - idleSince) : 0,
            deadLetterSize: queue.name.endsWith(".dlq") ? queue.messages : 0,
            deadLetterGrowth: queue.name.endsWith(".dlq")
              ? queue.messages - previousCount
              : 0,
            publishFailures: Number(
              (queue.message_stats as Record<string, unknown> | undefined)?.publish ?? 0
            ),
            unroutableEvents: Number(
              (queue.message_stats as Record<string, unknown> | undefined)?.drop_unroutable ?? 0
            ),
            reconnecting: queue.state === "blocked"
          };
        });
    }
  });
}
