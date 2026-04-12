import { intersectScopes, type StrategyScope } from "./scope.js";

export const exportResources = [
  "decisions",
  "trades",
  "skips",
  "alerts",
  "pnl",
  "operations",
  "audit_logs"
] as const;

export const exportColumnProfiles = ["summary", "detailed", "raw_payload"] as const;

export type ExportResource = (typeof exportResources)[number];
export type ExportColumnProfile = (typeof exportColumnProfiles)[number];

export interface AllowedExportResource {
  readonly resource: ExportResource;
  readonly strategyScope: StrategyScope;
  readonly columnProfile: ExportColumnProfile;
}

export function intersectAllowedExportResources(
  scope: StrategyScope,
  grants: readonly AllowedExportResource[]
): AllowedExportResource[] {
  return grants
    .map((grant) => ({
      ...grant,
      strategyScope: intersectScopes(scope, grant.strategyScope)
    }))
    .filter((grant) => grant.strategyScope[0] === "*" || grant.strategyScope.length > 0);
}
