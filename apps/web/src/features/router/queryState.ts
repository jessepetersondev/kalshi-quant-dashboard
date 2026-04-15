import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export type TimezoneMode = "utc" | "local";
export type LifecycleSort = "newest" | "oldest";

export interface LifecycleQueryState {
  readonly page: number;
  readonly pageSize: number;
  readonly sort: LifecycleSort;
  readonly search: string;
  readonly timezone: TimezoneMode;
  readonly range: string;
  readonly strategy: string[] | undefined;
  readonly symbol: string[] | undefined;
  readonly market: string[] | undefined;
  readonly status: string[] | undefined;
  readonly lifecycleStage: string[] | undefined;
  readonly detail: string | null;
}

export interface LifecycleQueryPatch {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: LifecycleSort;
  readonly search?: string;
  readonly timezone?: TimezoneMode;
  readonly range?: string;
  readonly strategy?: string[] | null;
  readonly symbol?: string[] | null;
  readonly market?: string[] | null;
  readonly status?: string[] | null;
  readonly lifecycleStage?: string[] | null;
  readonly detail?: string | null;
}

interface LifecycleQueryStateOptions {
  readonly defaultRange?: string;
}

export function resolveLifecycleRange(
  searchParams: URLSearchParams,
  defaultRange = "24h"
): string {
  return searchParams.get("range") ?? defaultRange;
}

function parseCsvParam(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function setOrDelete(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (!value) {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

export function useTimezoneQueryState() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const mode: TimezoneMode = searchParams.get("timezone") === "local" ? "local" : "utc";

  return {
    mode,
    setMode(nextMode: TimezoneMode) {
      const next = new URLSearchParams(searchParams);
      next.set("timezone", nextMode);
      navigate(`${location.pathname}?${next.toString()}`, { replace: true });
    }
  };
}

export function useLifecycleQueryState(options: LifecycleQueryStateOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const defaultRange = options.defaultRange ?? "24h";

  const state = useMemo<LifecycleQueryState>(
    () => ({
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "50"),
      sort: searchParams.get("sort") === "oldest" ? "oldest" : "newest",
      search: searchParams.get("search") ?? "",
      timezone: searchParams.get("timezone") === "local" ? "local" : "utc",
      range: resolveLifecycleRange(searchParams, defaultRange),
      strategy: parseCsvParam(searchParams.get("strategy")),
      symbol: parseCsvParam(searchParams.get("symbol")),
      market: parseCsvParam(searchParams.get("market")),
      status: parseCsvParam(searchParams.get("status")),
      lifecycleStage: parseCsvParam(searchParams.get("lifecycleStage")),
      detail: searchParams.get("detail")
    }),
    [defaultRange, searchParams]
  );

  function patch(nextState: LifecycleQueryPatch) {
    const next = new URLSearchParams(searchParams);
    setOrDelete(next, "page", nextState.page ? String(nextState.page) : searchParams.get("page"));
    setOrDelete(
      next,
      "pageSize",
      nextState.pageSize ? String(nextState.pageSize) : searchParams.get("pageSize")
    );
    setOrDelete(next, "sort", nextState.sort ?? searchParams.get("sort"));
    setOrDelete(next, "search", nextState.search ?? searchParams.get("search"));
    setOrDelete(next, "timezone", nextState.timezone ?? searchParams.get("timezone"));
    setOrDelete(next, "range", nextState.range ?? searchParams.get("range"));
    setOrDelete(
      next,
      "strategy",
      nextState.strategy === null
        ? null
        : nextState.strategy?.join(",") ?? searchParams.get("strategy")
    );
    setOrDelete(
      next,
      "symbol",
      nextState.symbol === null ? null : nextState.symbol?.join(",") ?? searchParams.get("symbol")
    );
    setOrDelete(
      next,
      "market",
      nextState.market === null ? null : nextState.market?.join(",") ?? searchParams.get("market")
    );
    setOrDelete(
      next,
      "status",
      nextState.status === null ? null : nextState.status?.join(",") ?? searchParams.get("status")
    );
    setOrDelete(
      next,
      "lifecycleStage",
      nextState.lifecycleStage === null
        ? null
        : nextState.lifecycleStage?.join(",") ?? searchParams.get("lifecycleStage")
    );
    setOrDelete(
      next,
      "detail",
      nextState.detail === undefined ? searchParams.get("detail") : nextState.detail
    );
    navigate(`${location.pathname}?${next.toString()}`);
  }

  return {
    state,
    setState: patch
  };
}
