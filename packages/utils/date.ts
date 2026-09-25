export function formatDate(iso: string, locale: string = "en"): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string, locale: string = "en"): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}