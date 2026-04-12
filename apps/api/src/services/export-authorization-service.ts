import type {
  CsvExportResource,
  EffectiveCapability
} from "@kalshi-quant-dashboard/contracts";

import { ExportScopeResolver } from "../auth/export-scope-resolver.js";

export class ExportAuthorizationService {
  constructor(private readonly scopeResolver = new ExportScopeResolver()) {}

  authorize(args: {
    readonly effectiveCapability: EffectiveCapability;
    readonly resource: CsvExportResource;
    readonly requestedStrategies?: readonly string[];
  }) {
    return this.scopeResolver.resolve({
      effectiveCapability: args.effectiveCapability,
      resource: args.resource,
      requestedColumnProfile:
        args.resource === "trades" ? "detailed" : "summary",
      ...(args.requestedStrategies ? { requestedStrategies: args.requestedStrategies } : {})
    });
  }
}
