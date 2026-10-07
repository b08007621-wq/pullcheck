import type { SealedProduct } from '@/types/sealed';
import { isPokemonMarket } from '@/utils/market';

import { type CachePolicy, cachedFetch } from './cache';
import { getJson } from './http';

type AssetSet = {
  id: string;
  lang: string;
  name: string;
  series: string;
  files: string[];
};

export type AssetManifest = {
  base: string;
  sets: AssetSet[];
};

const MANIFEST_URL = 'https://cdn.jsdelivr.net/gh/b08007621-wq/pullcheck@card-index/assets.json';
const MANIFEST_CACHE: CachePolicy = { bucket: 'ptcg-assets', ttlMs: 7 * 24 * 60 * 60 * 1000, maxEntries: 1 };
const REQUEST = { timeoutMs: 15000, retryBudgetMs: 30000, maxAttempts: 3 };
const SET_PREFIX = /^[A-Za-z]{1,6}[\d.]*[a-z]?:\s*/;
const USABLE = /\.(png|webp|jpe?g)$/i;
const FILLER = new Set(['pokemon', 'tcg', 'the', 'and', 'set', 'base', 'of']);
const NAMED = /^(logo|symbol|display|booster-bundle|elite-trainer-box|single-blister|triple-blister)/;

let pending: Promise<AssetManifest> | null = null;

export function loadAssetManifest(): Promise<AssetManifest> {
  pending ??= cachedFetch('manifest', MANIFEST_CACHE, () => getJson<AssetManifest>(MANIFEST_URL, REQUEST))
    .then(({ value }) => value)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}

export function productArtUrl(product: SealedProduct, manifest: AssetManifest): string | null {
  if (product.cardNumber || !isPokemonMarket(product.market)) return null;
  const set = findSet(product, manifest);
  if (!set) return null;
  const file = pickFile(product.name, set.files.filter((entry) => USABLE.test(entry)));
  return file ? `${manifest.base}${set.id}/${file.split('/').map(encodeURIComponent).join('/')}` : null;
}

function findSet(product: SealedProduct, manifest: AssetManifest): AssetSet | null {
  const lang = product.market === 'jp' ? 'ja' : 'en';
  const code = (product.setCode ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lang === 'ja' && code) {
    const byCode = manifest.sets.find((set) => set.id === `ja_${code}`);
    if (byCode) return byCode;
  }
  const wanted = product.setName.replace(SET_PREFIX, '');
  const matches = manifest.sets.filter((set) => set.lang === lang && sameSetName(wanted, set));
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function sameSetName(wanted: string, set: AssetSet): boolean {
  const meaningful = (value: string) => words(value).filter((word) => !FILLER.has(word));
  const left = meaningful(wanted);
  const right = meaningful(set.name);
  if (sameWords(left, right)) return true;
  const series = new Set(words(set.series));
  const leftCore = left.filter((word) => !series.has(word));
  return leftCore.length > 0 && sameWords(leftCore, right.filter((word) => !series.has(word)));
}

function sameWords(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((word, index) => word === right[index]);
}

function pickFile(productName: string, files: string[]): string | null {
  const name = productName.toLowerCase();
  const top = files.filter((file) => !file.includes('/'));
  const starting = (prefix: string) => top.filter((file) => file.startsWith(prefix));
  const tokens = new Set(words(productName));

  if (/\bcase\b/.test(name)) return null;
  if (name.includes('elite trainer box')) {
    const boxes = starting('elite-trainer-box');
    return (/pokemon center/.test(name) && boxes.length > 1 ? boxes[1] : boxes[0]) ?? null;
  }
  if (/booster (box|display)|display box/.test(name)) return starting('display.')[0] ?? null;
  if (name.includes('booster bundle')) return starting('booster-bundle.')[0] ?? null;
  if (name.includes('mini tin')) {
    return bestMatch(files.filter((file) => file.startsWith('mini-tins/')), tokens);
  }
  if (name.includes('blister')) {
    const kind = /3 pack|three pack|triple/.test(name) ? 'triple-blister' : 'single-blister';
    const blisters = starting(kind);
    return blisters.length === 1 ? (blisters[0] ?? null) : null;
  }
  if (/booster pack|sleeved booster|\bbooster$/.test(name)) {
    const packs = files.filter((file) => file.startsWith('packshots/'));
    const art = new Set(words(/\[([^\]]+)\]/.exec(productName)?.[1] ?? ''));
    return (art.size > 0 ? bestMatch(packs, art, false) : null) ?? packs[0] ?? null;
  }
  return bestMatch(
    top.filter((file) => !NAMED.test(file)),
    tokens,
  );
}

function bestMatch(files: string[], tokens: Set<string>, everyWord = true): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const file of files) {
    const base = file.slice(file.lastIndexOf('/') + 1).replace(/\.\w+$/, '');
    const parts = words(base);
    if (parts.length === 0) continue;
    const hits = parts.filter((part) => tokens.has(part)).length;
    if (everyWord ? hits !== parts.length : hits === 0) continue;
    if (hits > bestCount) {
      best = file;
      bestCount = hits;
    }
  }
  return best;
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[éè]/g, 'e')
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
