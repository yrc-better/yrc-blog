const DAY_MS = 86_400_000;

export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

export function newestFirst<T extends { data: { date: Date } }>(a: T, b: T): number {
  return b.data.date.getTime() - a.data.date.getTime();
}
