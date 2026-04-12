export interface FieldMapping {
  readonly sourceVariant: string;
  readonly sourceField: string;
  readonly canonicalField: string;
  readonly rule: string;
}

export const fieldMappings: readonly FieldMapping[] = [
  {
    sourceVariant: "publisher-envelope-v1",
    sourceField: "id",
    canonicalField: "sourceEventId",
    rule: "Primary dedup identity for publisher envelopes."
  },
  {
    sourceVariant: "publisher-envelope-v1",
    sourceField: "correlationId",
    canonicalField: "correlationId",
    rule: "Canonical lifecycle key when present."
  },
  {
    sourceVariant: "publisher-envelope-v1",
    sourceField: "attributes.publisherOrderId",
    canonicalField: "aliases[publisher_order_id]",
    rule: "Searchable order identifier alias."
  },
  {
    sourceVariant: "standalone-executor-v1",
    sourceField: "externalOrderId",
    canonicalField: "aliases[external_order_id]",
    rule: "Preferred execution identity after submission."
  },
  {
    sourceVariant: "standalone-executor-v1",
    sourceField: "commandEventId",
    canonicalField: "aliases[command_event_id]",
    rule: "Executor routing and retry correlation."
  },
  {
    sourceVariant: "quant-runtime-v1",
    sourceField: "latest_decisions[]",
    canonicalField: "decision normalized payload",
    rule: "Direct strategy decisions and skip facts come from runtime snapshots."
  },
  {
    sourceVariant: "quant-positions-v1",
    sourceField: "[]",
    canonicalField: "position_snapshot",
    rule: "Direct strategy positions are first-class persisted facts and not inferred from trades."
  },
  {
    sourceVariant: "quant-no-trade-diagnostics-v1",
    sourceField: "top_reasons[]",
    canonicalField: "skip normalized payload",
    rule: "Skip-only/no-trade diagnostics are first-class skip facts, not inferred absences."
  },
  {
    sourceVariant: "rabbitmq-management-v1",
    sourceField: "messages",
    canonicalField: "queue metric message_count",
    rule: "Primary backlog size metric."
  }
];
