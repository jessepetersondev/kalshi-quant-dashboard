import type { SourceProfile } from "@kalshi-quant-dashboard/source-adapters";
import type { SourceObservationInput } from "@kalshi-quant-dashboard/source-adapters";

import type { CollectorHandle } from "../collectors/collector-runner.js";
import { HttpPoller } from "../collectors/http-poller.js";
import type { SourceIngestService } from "../services/source-ingest-service.js";

export interface HttpSourceCollectorOptions<TPayload> {
  readonly name: string;
  readonly url: string;
  readonly sourceProfile: SourceProfile;
  readonly sourceRepo: string;
  readonly strategyId?: string;
  readonly sourceIngestService: SourceIngestService;
  readonly transform?: (payload: unknown, receivedAt: string) => readonly TPayload[];
}

export class HttpSourceCollector<TPayload = unknown> implements CollectorHandle {
  readonly name: string;

  private readonly poller = new HttpPoller();

  constructor(private readonly options: HttpSourceCollectorOptions<TPayload>) {
    this.name = options.name;
  }

  async run(): Promise<void> {
    const response = await this.poller.pollJson<unknown>(this.options.url);
    const payloads =
      this.options.transform?.(response.body, response.receivedAt) ??
      ([response.body] as const);

    for (const payload of payloads) {
      const observation: SourceObservationInput = {
        sourceProfile: this.options.sourceProfile,
        sourceRepo: this.options.sourceRepo,
        payload,
        metadata: {
          receivedAt: response.receivedAt,
          sourceSequence: response.receivedAt
        }
      };

      if (this.options.strategyId) {
        Object.assign(observation, {
          strategyId: this.options.strategyId
        });
      }

      await this.options.sourceIngestService.ingest(observation);
    }
  }
}
