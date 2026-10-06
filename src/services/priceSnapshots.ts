import { readJson, STORAGE_KEYS, writeJson } from './storage';

type Snapshot = Record<string, number>;

type SnapshotStore = Record<string, Snapshot>;

const KEEP_DAYS = 21;

export async function recordSnapshot(day: string, prices: Snapshot): Promise<SnapshotStore> {
  const store = (await readJson<SnapshotStore>(STORAGE_KEYS.snapshots)) ?? {};
  const merged: SnapshotStore = { ...store, [day]: { ...store[day], ...prices } };
  const days = Object.keys(merged).sort().slice(-KEEP_DAYS);
  const trimmed = Object.fromEntries(days.map((key) => [key, merged[key] ?? {}]));
  await writeJson(STORAGE_KEYS.snapshots, trimmed);
  return trimmed;
}

export function compareSnapshots(store: SnapshotStore, today: string, maxAgeDays: number): { from: string; changes: Map<string, number> } | null {
  const earliest = shiftDay(today, -maxAgeDays);
  const base = Object.keys(store)
    .filter((day) => day < today && day >= earliest)
    .sort()[0];
  const current = store[today];
  if (!base || !current) return null;
  const before = store[base] ?? {};
  const changes = new Map<string, number>();
  for (const [key, price] of Object.entries(current)) {
    const old = before[key];
    if (old && old > 0) changes.set(key, (price - old) / old);
  }
  return { from: base, changes };
}

export function dayStamp(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDay(day: string, offset: number): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return dayStamp(new Date(year, month - 1, date + offset));
}
