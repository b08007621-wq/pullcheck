import type { Market } from '@/types/sealed';

import { readJson, STORAGE_KEYS, writeJson } from './storage';
import { loadGroupProducts, productField, type TcgcsvGroup, type TcgcsvProduct } from './tcgcsv';

type ArtStore = Record<string, string | null>;

const PREFERENCE = [/booster box|booster display/i, /elite trainer box/i, /booster bundle/i, /booster pack/i, /box/i];
const CONCURRENCY = 2;

let store: ArtStore | null = null;
let loading: Promise<ArtStore> | null = null;
const pending = new Map<string, Promise<string | null>>();
const queue: (() => void)[] = [];
let active = 0;

export async function getGroupArt(groupId: number, market: Market): Promise<string | null> {
  const key = `${market}:${groupId}`;
  const known = await readStore();
  if (key in known) return known[key] ?? null;
  const existing = pending.get(key);
  if (existing) return existing;

  const work = schedule(async () => {
    const group = { groupId, market } as TcgcsvGroup;
    const { value } = await loadGroupProducts(group);
    const art = pickArt(value);
    known[key] = art;
    writeJson(STORAGE_KEYS.groupArt, known);
    return art;
  }).finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}

function pickArt(products: TcgcsvProduct[]): string | null {
  const sealed = products.filter((product) => !productField(product, 'Number') && product.imageUrl);
  for (const pattern of PREFERENCE) {
    const match = sealed.find((product) => pattern.test(product.name));
    if (match) return match.imageUrl;
  }
  return sealed[0]?.imageUrl ?? products.find((product) => product.imageUrl)?.imageUrl ?? null;
}

function readStore(): Promise<ArtStore> {
  if (store) return Promise.resolve(store);
  loading ??= readJson<ArtStore>(STORAGE_KEYS.groupArt).then((value) => {
    store = value && typeof value === 'object' ? value : {};
    return store;
  });
  return loading;
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      task()
        .then(resolve, reject)
        .finally(() => {
          active--;
          queue.shift()?.();
        });
    };
    if (active < CONCURRENCY) run();
    else queue.push(run);
  });
}
