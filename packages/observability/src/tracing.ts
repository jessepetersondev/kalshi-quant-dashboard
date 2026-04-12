import { randomUUID } from "node:crypto";

export interface TraceSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly name: string;
  end(attributes?: Record<string, unknown>): TraceRecord;
}

export interface TraceRecord {
  readonly traceId: string;
  readonly spanId: string;
  readonly name: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly attributes: Record<string, unknown>;
}

export function startSpan(name: string): TraceSpan {
  const traceId = randomUUID();
  const spanId = randomUUID();
  const startedAt = new Date().toISOString();

  return {
    traceId,
    spanId,
    name,
    end(attributes: Record<string, unknown> = {}) {
      return {
        traceId,
        spanId,
        name,
        startedAt,
        endedAt: new Date().toISOString(),
        attributes
      };
    }
  };
}
