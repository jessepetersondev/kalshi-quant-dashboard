export type StrategyScope = readonly string[] | readonly ["*"];

function isWildcardScope(scope: StrategyScope): scope is readonly ["*"] {
  return scope[0] === "*";
}

export function normalizeScope(scope: readonly string[] | undefined): StrategyScope {
  if (!scope || scope.length === 0) {
    return ["*"];
  }

  if (scope.some((value) => value === "*")) {
    return ["*"];
  }

  return [...new Set(scope)].sort();
}

export function scopeAllows(scope: StrategyScope, strategyId: string): boolean {
  if (isWildcardScope(scope)) {
    return true;
  }

  return scope.includes(strategyId);
}

export function intersectScopes(
  left: StrategyScope,
  right: StrategyScope
): StrategyScope {
  if (isWildcardScope(left)) {
    return right;
  }

  if (isWildcardScope(right)) {
    return left;
  }

  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}
