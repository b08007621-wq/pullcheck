import { isAbortError } from './http';
import { readJson, removeKeys, STORAGE_KEYS, writeJson } from './storage';

export type CachePolicy = {
  bucket: string;
  ttlMs: number;
  maxEntries: number;
};

export type Cached<T> = {
  value: T;
  stale: boolean;
};

type Entry<T> = {
  value: T;
  savedAt: number;
};

type IndexEntry = {
  key: string;
  bucket: string;
  savedAt: number;
};

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
let indexQueue: Promise<void> = Promise.resolve();

export async function cachedFetch<T>(
  key: string,
  policy: CachePolicy,
  load: () => Promise<T>,
  options: { force?: boolean } = {},
): Promise<Cached<T>> {
  const fullKey = `${policy.bucket}:${key}`;

  if (!options.force) {
    const hit = await readEntry<T>(fullKey);
    if (hit && Date.now() - hit.savedAt < policy.ttlMs) return { value: hit.value, stale: false };
  }

  try {
    const value = await dedupe(fullKey, load);
    const entry: Entry<T> = { value, savedAt: Date.now() };
    memory.set(fullKey, entry);
    persist(fullKey, entry, policy);
    return { value, stale: false };
  } catch (error) {
    if (isAbortError(error)) throw error;
    const fallback = await readEntry<T>(fullKey);
    if (fallback) return { value: fallback.value, stale: true };
    throw error;
  }
}

export function peekCache<T>(key: string, policy: CachePolicy): T | null {
  const entry = memory.get(`${policy.bucket}:${key}`) as Entry<T> | undefined;
  return entry?.value ?? null;
}

async function readEntry<T>(fullKey: string): Promise<Entry<T> | null> {
  const cached = memory.get(fullKey) as Entry<T> | undefined;
  if (cached) return cached;
  const stored = await readJson<Entry<T>>(storageKey(fullKey));
  if (stored && typeof stored.savedAt === 'number') {
    memory.set(fullKey, stored);
    return stored;
  }
  return null;
}

function dedupe<T>(fullKey: string, load: () => Promise<T>): Promise<T> {
  const running = inflight.get(fullKey) as Promise<T> | undefined;
  if (running) return running;
  const promise = load().finally(() => inflight.delete(fullKey));
  inflight.set(fullKey, promise);
  return promise;
}

function persist<T>(fullKey: string, entry: Entry<T>, policy: CachePolicy) {
  indexQueue = indexQueue
    .then(async () => {
      await writeJson(storageKey(fullKey), entry);
      const index = (await readJson<IndexEntry[]>(STORAGE_KEYS.cacheIndex)) ?? [];
      const next = [
        ...index.filter((item) => item.key !== fullKey),
        { key: fullKey, bucket: policy.bucket, savedAt: entry.savedAt },
      ];
      const inBucket = next.filter((item) => item.bucket === policy.bucket).sort((a, b) => a.savedAt - b.savedAt);
      const evicted = inBucket.slice(0, Math.max(0, inBucket.length - policy.maxEntries)).map((item) => item.key);
      for (const evictedKey of evicted) memory.delete(evictedKey);
      await removeKeys(evicted.map(storageKey));
      await writeJson(
        STORAGE_KEYS.cacheIndex,
        next.filter((item) => !evicted.includes(item.key)),
      );
    })
    .catch(() => {});
}

function storageKey(fullKey: string): string {
  return `pullcheck.cache.${fullKey}`;
}
