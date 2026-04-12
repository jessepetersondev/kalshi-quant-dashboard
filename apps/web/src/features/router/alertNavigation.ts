export function buildAlertDetailPath(alertId: string, search: string): string {
  return `/alerts/${encodeURIComponent(alertId)}${search}`;
}

export function buildAlertDrawerSearch(currentSearch: string, alertId: string | null): string {
  const next = new URLSearchParams(currentSearch);
  if (alertId) {
    next.set("detail", alertId);
  } else {
    next.delete("detail");
  }

  const serialized = next.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}
