import type { Card, CardSet, TcgPlayerPrice } from '@/types/card';
import type { SetInfo } from '@/types/set';
import { largeProductImage } from '@/utils/sealed';

import { normalizeCardName } from './cardQuery';
import { normalizeText } from './sealedQuery';
import { loadSets } from './sets';
import {
  displaySetName,
  isMainSet,
  loadGroupCatalogChecked,
  loadGroupProducts,
  loadGroups,
  productField,
  type TcgcsvGroup,
  type TcgcsvProduct,
} from './tcgcsv';

type ExtraEntry = {
  card: Card;
  group: TcgcsvGroup;
  productId: number;
};

type FetchOptions = {
  force?: boolean;
};

const CARD_PREFIX = 'tcg-';
const SET_PREFIX = 'tcg-set-';
const FETCH_GAP_MS = 2000;
const NETWORK_THRESHOLD_MS = 150;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_PROMO_MS = 540 * DAY_MS;
const RECENT_SET_MS = 400 * DAY_MS;
const UPCOMING_SET_MS = 120 * DAY_MS;
const EXTRA_GROUP_IDS = new Set([24451, 22872, 2332, 1938, 2289, 2776, 24584, 24529, 24163, 23561, 23323]);
const ERA_PROMO_GROUP = /^[A-Z]{1,5}\d*:.*promo/i;
const OVERLAPPING_SETS: Record<number, string> = { 22872: 'svp' };
const SERIES_BY_PREFIX: [RegExp, string][] = [
  [/^ME\w*:/, 'Mega Evolution'],
  [/^SV\w*:/, 'Scarlet & Violet'],
  [/^SWSH\w*:/, 'Sword & Shield'],
];

let index: ExtraEntry[] | null = null;
let partial: ExtraEntry[] = [];
let building: Promise<ExtraEntry[]> | null = null;
const listeners = new Set<() => void>();

export function isExtraCardId(id: string): boolean {
  return id.startsWith(CARD_PREFIX) && !id.startsWith(SET_PREFIX);
}

export function isExtraSetId(id: string): boolean {
  return id.startsWith(SET_PREFIX);
}

export function extraIndexReady(): boolean {
  return index !== null;
}

export function subscribeExtraIndex(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadExtraIndex(): Promise<ExtraEntry[]> {
  if (index) return Promise.resolve(index);
  building ??= buildIndex()
    .then((entries) => {
      index = entries;
      for (const listener of listeners) listener();
      return entries;
    })
    .finally(() => {
      building = null;
    });
  return building;
}

export function searchExtraCards(query: string): Card[] {
  const tokens = normalizeCardName(query).toLowerCase().split(/\s+/).filter(Boolean);
  const entries = index ?? partial;
  if (entries.length === 0 || tokens.length === 0) return [];
  return entries
    .filter((entry) => {
      const words = normalizeText(entry.card.name).split(' ');
      return tokens.every((token) => words.some((word) => word.startsWith(normalizeText(token))));
    })
    .map((entry) => entry.card)
    .sort((first, second) => second.set.releaseDate.localeCompare(first.set.releaseDate));
}

export async function withExtraPrices(cards: Card[], options: FetchOptions = {}): Promise<Card[]> {
  const entries = await loadExtraIndex();
  const byId = new Map(entries.map((entry) => [entry.card.id, entry]));
  const groups = new Map<number, TcgcsvGroup>();
  for (const card of cards) {
    const entry = byId.get(card.id);
    if (entry) groups.set(entry.group.groupId, entry.group);
  }

  const prices = new Map<number, Record<string, TcgPlayerPrice>>();
  for (const group of groups.values()) {
    try {
      const { value } = await loadGroupCatalogChecked(group, options);
      for (const listing of value.cards) prices.set(listing.productId, listing.prices);
    } catch {}
  }

  return cards.map((card) => {
    const entry = byId.get(card.id);
    const found = entry ? prices.get(entry.productId) : undefined;
    if (!entry || !found) return card;
    return { ...card, tcgplayer: { url: card.tcgplayer?.url ?? '', updatedAt: todayStamp(), prices: found } };
  });
}

export async function getExtraCard(id: string, options: FetchOptions = {}): Promise<Card> {
  const entries = await loadExtraIndex();
  const entry = entries.find((item) => item.card.id === id);
  if (!entry) throw new Error('Card not found');
  const [card] = await withExtraPrices([entry.card], options);
  return card ?? entry.card;
}

export async function getExtraSetCards(setId: string, options: FetchOptions = {}): Promise<Card[]> {
  const entries = await loadExtraIndex();
  const cards = entries.filter((entry) => entry.card.set.id === setId).map((entry) => entry.card);
  return withExtraPrices(cards, options);
}

export async function refreshExtraCards(ids: string[]): Promise<Card[]> {
  if (ids.length === 0) return [];
  const entries = await loadExtraIndex();
  const wanted = new Set(ids);
  const cards = entries.filter((entry) => wanted.has(entry.card.id)).map((entry) => entry.card);
  return withExtraPrices(cards, { force: true });
}

export function extraSets(): SetInfo[] {
  const entries = index ?? partial;
  const bySet = new Map<string, SetInfo>();
  for (const { card } of entries) {
    if (bySet.has(card.set.id)) continue;
    bySet.set(card.set.id, {
      id: card.set.id,
      name: card.set.name,
      series: card.set.series,
      releaseDate: card.set.releaseDate,
      total: card.set.total,
      printedTotal: card.set.printedTotal ?? card.set.total,
      ptcgoCode: card.set.ptcgoCode ?? null,
      logo: '',
      symbol: '',
    });
  }
  return [...bySet.values()];
}

export async function findExtraCard(name: string, number: string | null, strict = false): Promise<Card[]> {
  await loadExtraIndex();
  const target = number ? normalizeNumber(number) : null;
  const named = searchExtraCards(name);
  const exact = target ? named.filter((card) => normalizeNumber(card.number) === target) : [];
  const picked = exact.length > 0 || strict ? exact : named;
  return picked.length > 0 ? withExtraPrices(picked.slice(0, 12)) : [];
}

async function buildIndex(): Promise<ExtraEntry[]> {
  const [groups, sets] = await Promise.all([loadGroups('en'), loadSets().catch(() => [])]);
  const covered = new Set(sets.map((set) => normalizeText(set.name)));
  const overlapTotals = new Map(sets.map((set) => [set.id, set.total]));
  const now = Date.now();
  const chosen = groups.filter((group) => {
    if (EXTRA_GROUP_IDS.has(group.groupId)) return true;
    const published = group.publishedOn ? Date.parse(group.publishedOn) : 0;
    const uncovered = !covered.has(normalizeText(displaySetName(group)));
    if (isMainSet(group) && uncovered && published > now - RECENT_SET_MS && published < now + UPCOMING_SET_MS) {
      return true;
    }
    return (
      ERA_PROMO_GROUP.test(group.name) &&
      now - published < RECENT_PROMO_MS &&
      !covered.has(normalizeText(displaySetName(group)))
    );
  });

  chosen.sort((first, second) => second.groupId - first.groupId);
  const entries: ExtraEntry[] = [];
  for (const group of chosen) {
    const started = Date.now();
    try {
      const { value } = await loadGroupProducts(group);
      const overlap = OVERLAPPING_SETS[group.groupId];
      entries.push(...toEntries(group, value, overlap ? (overlapTotals.get(overlap) ?? 0) : 0));
      partial = [...entries];
      for (const listener of listeners) listener();
    } catch {}
    if (Date.now() - started > NETWORK_THRESHOLD_MS) await wait(FETCH_GAP_MS);
  }
  return entries;
}

function toEntries(group: TcgcsvGroup, products: TcgcsvProduct[], skipUpTo: number): ExtraEntry[] {
  const cards = products.filter((product) => {
    const number = productField(product, 'Number');
    if (!number || /^code card/i.test(product.name)) return false;
    const numeric = Number.parseInt(number.replace(/^\D+/, ''), 10);
    return !skipUpTo || !Number.isFinite(numeric) || numeric > skipUpTo;
  });
  if (cards.length === 0) return [];

  const numbers = cards
    .map((product) => Number.parseInt((productField(product, 'Number') ?? '').replace(/^\D+/, ''), 10))
    .filter(Number.isFinite);
  const set: CardSet = {
    id: `${SET_PREFIX}${group.groupId}`,
    name: displaySetName(group),
    series: SERIES_BY_PREFIX.find(([pattern]) => pattern.test(group.name))?.[1] ?? 'Promos',
    total: cards.length,
    printedTotal: numbers.length > 0 ? Math.max(...numbers) : cards.length,
    releaseDate: slashDate(group.publishedOn),
    ptcgoCode: group.abbreviation ?? undefined,
    images: { symbol: '', logo: '' },
  };
  return cards.map((product) => ({ card: toCard(product, set), group, productId: product.productId }));
}

function toCard(product: TcgcsvProduct, set: CardSet): Card {
  const { name, printing } = cleanName(product.name);
  const hp = productField(product, 'HP');
  const cardType = productField(product, 'Card Type');
  const stage = productField(product, 'Stage');
  const subtypes = [
    ...(stage ? [stage] : []),
    ...(/ ex$/i.test(name) ? ['ex'] : []),
    ...(/^Mega /.test(name) ? ['MEGA'] : []),
  ];
  return {
    id: `${CARD_PREFIX}${product.productId}`,
    name,
    number: productField(product, 'Number') ?? '',
    rarity: productField(product, 'Rarity') ?? 'Promo',
    set,
    images: { small: product.imageUrl, large: largeProductImage(product.imageUrl) },
    tcgplayer: { url: product.url },
    supertype: hp ? 'Pokémon' : /energy/i.test(name) ? 'Energy' : 'Trainer',
    subtypes,
    hp: hp ?? undefined,
    types: hp && cardType ? [cardType] : undefined,
    printing,
  };
}

function cleanName(raw: string): { name: string; printing: string | null } {
  const tags = [...raw.matchAll(/[[(]([^\])]+)[\])]/g)].map((match) => prettyTag(match[1] ?? ''));
  const name = raw
    .replace(/[[(][^\])]+[\])]/g, ' ')
    .replace(/\s+-\s+[A-Z]*\d+[a-z]?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { name, printing: tags.length > 0 ? tags.join(' · ') : null };
}

function prettyTag(tag: string): string {
  return tag.trim().replace(/\bPokemon\b/g, 'Pokémon');
}

function normalizeNumber(value: string): string {
  const printed = value.split('/')[0]?.trim().toUpperCase() ?? '';
  const digits = printed.replace(/^[A-Z]+/, '');
  return /^\d+$/.test(digits) ? String(Number.parseInt(digits, 10)) : printed;
}

function slashDate(value: string | null): string {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return match ? `${match[1]}/${match[2]}/${match[3]}` : '1999/01/01';
}

function todayStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
