export const DISPLAY_TIMEZONE_LABEL = "CST";
const DISPLAY_TIMEZONE = "Etc/GMT+6";

const centralInputFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

function getCentralInputPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function formatTimestamp(
  value: string | null | undefined,
  mode: "utc" | "local"
): string {
  if (!value) {
    return "unknown";
  }

  void mode;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return `${date.toLocaleString("en-US", { timeZone: DISPLAY_TIMEZONE })} ${DISPLAY_TIMEZONE_LABEL}`;
}

export function toCentralDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = centralInputFormatter.formatToParts(date);
  const year = getCentralInputPart(parts, "year");
  const month = getCentralInputPart(parts, "month");
  const day = getCentralInputPart(parts, "day");
  const hour = getCentralInputPart(parts, "hour");
  const minute = getCentralInputPart(parts, "minute");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function fromCentralDateTimeInput(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  return new Date(`${value}:00-06:00`).toISOString();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}
