export function formatTimestamp(
  value: string | null | undefined,
  mode: "utc" | "local"
): string {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);
  return mode === "local"
    ? date.toLocaleString()
    : date.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}
