const MAX_POINTS = 120;

export function dayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function upsertPoint<T extends { date: string }>(points: T[] | undefined, point: T): T[] {
  const list = points ?? [];
  const last = list[list.length - 1];
  const next = last?.date === point.date ? [...list.slice(0, -1), point] : [...list, point];
  return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}
