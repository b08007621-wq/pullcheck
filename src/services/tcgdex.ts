import type { Card, CardAttack, CardSet, Cardmarket, TcgPlayer, TcgPlayerPrice } from '@/types/card';
import type { SetInfo } from '@/types/set';
import type {
  DexAttack,
  DexCard,
  DexLanguage,
  DexSet,
  DexSetBrief,
  DexTcgVariantPrice,
  LocalizedCard,
} from '@/types/tcgdex';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson } from './http';
import { japaneseLogoFor } from './japaneseLogos';
import { normalizeText } from './sealedQuery';
import { loadSets } from './sets';

const BASE_URL = 'https://api.tcgdex.net/v2';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const REQUEST = { timeoutMs: 7000, retryBudgetMs: 14000, maxAttempts: 3 };

const SET_LIST_CACHE: CachePolicy = { bucket: 'dex-sets', ttlMs: DAY, maxEntries: 4 };
const SET_CACHE: CachePolicy = { bucket: 'dex-set', ttlMs: 7 * DAY, maxEntries: 120 };
const SET_CARDS_CACHE: CachePolicy = { bucket: 'dex-set-cards', ttlMs: DAY, maxEntries: 8 };
const CARD_CACHE: CachePolicy = { bucket: 'dex-card', ttlMs: 6 * HOUR, maxEntries: 300 };
const SEARCH_CACHE: CachePolicy = { bucket: 'dex-search', ttlMs: DAY, maxEntries: 60 };

const CARD_PREFIX = 'dex-';
const SET_MATCH_TIMEOUT_MS = 4000;
const LANGUAGES: DexLanguage[] = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ja'];

const missing = new Set<string>();

type DexSetWithCards = DexSet & {
  cards?: { id: string; localId: string; name: string; image?: string }[];
};

export function isDigitalSet(id: string): boolean {
  return /^[A-Z]/.test(id);
}

export async function searchDexCards(
  language: DexLanguage,
  name: string,
  localId: string,
  signal?: AbortSignal,
): Promise<{ id: string; localId: string; name: string }[]> {
  const query = `name=${encodeURIComponent(name)}&localId=${encodeURIComponent(localId)}`;
  const { value } = await cachedFetch(`${language}:${query}`, SEARCH_CACHE, async () => {
    const cards = await getJson<{ id: string; localId: string; name: string }[]>(
      `${BASE_URL}/${language}/cards?${query}`,
      { signal, ...REQUEST },
    );
    if (!Array.isArray(cards)) throw new ApiError('badResponse');
    return cards.map((card) => ({ id: card.id, localId: card.localId, name: card.name }));
  });
  return value;
}

export function isDexCardId(id: string): boolean {
  return id.startsWith(CARD_PREFIX) && parseDexId(id) !== null;
}

export function dexCardId(language: DexLanguage, id: string): string {
  return `${CARD_PREFIX}${language}-${id}`;
}

export function parseDexId(id: string): { language: DexLanguage; id: string } | null {
  if (!id.startsWith(CARD_PREFIX)) return null;
  const rest = id.slice(CARD_PREFIX.length);
  const language = rest.slice(0, 2) as DexLanguage;
  if (!LANGUAGES.includes(language) || rest[2] !== '-') return null;
  return { language, id: rest.slice(3) };
}

export async function loadDexSets(language: DexLanguage, signal?: AbortSignal): Promise<DexSetBrief[]> {
  const { value } = await cachedFetch(language, SET_LIST_CACHE, async () => {
    const sets = await getJson<DexSetBrief[]>(`${BASE_URL}/${language}/sets`, { signal, ...REQUEST });
    if (!Array.isArray(sets)) throw new ApiError('badResponse');
    return sets
      .filter((set) => set?.id && set.cardCount)
      .map((set) => ({ id: set.id, name: set.name, logo: set.logo, symbol: set.symbol, cardCount: set.cardCount }));
  });
  return value;
}

export async function getDexSet(language: DexLanguage, id: string, signal?: AbortSignal): Promise<DexSet> {
  const { value } = await cachedFetch(`${language}:${id}`, SET_CACHE, async () => {
    const set = await getJson<DexSetWithCards>(`${BASE_URL}/${language}/sets/${encodeURIComponent(id)}`, {
      signal,
      ...REQUEST,
    });
    if (!set?.id || !set.cardCount) throw new ApiError('badResponse');
    return toDexSet(set);
  });
  return value;
}

export async function getDexCard(
  language: DexLanguage,
  id: string,
  signal?: AbortSignal,
  options: { force?: boolean } = {},
): Promise<DexCard> {
  const { value } = await cachedFetch(
    `${language}:${id}`,
    CARD_CACHE,
    () => fetchCard(`${BASE_URL}/${language}/cards/${encodeURIComponent(id)}`, signal),
    options,
  );
  return value;
}

export async function findDexSetCard(
  language: DexLanguage,
  setId: string,
  number: string,
  signal?: AbortSignal,
): Promise<DexCard | null> {
  for (const localId of localIdCandidates(number)) {
    const key = `${language}:${setId}/${localId}`;
    if (missing.has(key)) continue;
    try {
      const { value } = await cachedFetch(key, CARD_CACHE, () =>
        fetchCard(`${BASE_URL}/${language}/sets/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}`, signal),
      );
      return value;
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'notFound') {
        missing.add(key);
        continue;
      }
      throw error;
    }
  }
  return null;
}

export async function getLocalizedCards(
  id: string,
  languages: DexLanguage[],
  signal?: AbortSignal,
): Promise<LocalizedCard[]> {
  const settled = await Promise.allSettled(languages.map((language) => getDexCard(language, id, signal)));
  return settled.flatMap((result, index) => {
    const language = languages[index];
    if (result.status !== 'fulfilled' || !language) return [];
    return [
      {
        language,
        name: result.value.name,
        setName: result.value.set.name,
        image: result.value.image ? `${result.value.image}/high.png` : null,
      },
    ];
  });
}

export async function dexToCard(card: DexCard, language: DexLanguage, signal?: AbortSignal): Promise<Card> {
  const set = await getDexSet(language, card.set.id, signal).catch(() => toDexSet(card.set));
  const ptcgSet = language === 'en' ? await matchPtcgSet(set, signal) : null;
  return buildCard(card, set, ptcgSet, language);
}

export function previewCard(card: DexCard, language: DexLanguage): Card {
  return buildCard(card, toDexSet(card.set), null, language);
}

export async function getDexCardAsCard(
  id: string,
  signal?: AbortSignal,
  options: { force?: boolean } = {},
): Promise<Card> {
  const parsed = parseDexId(id);
  if (!parsed) throw new ApiError('notFound');
  const card = await getDexCard(parsed.language, parsed.id, signal, options);
  const set = await getDexSet(parsed.language, card.set.id, signal).catch(() => toDexSet(card.set));
  return buildCard(card, set, null, parsed.language);
}

export function isDexSetId(id: string): boolean {
  return id.startsWith(CARD_PREFIX) && parseDexId(id) !== null;
}

export async function getDexSetCards(id: string, signal?: AbortSignal): Promise<Card[]> {
  const parsed = parseDexId(id);
  if (!parsed) throw new ApiError('notFound');
  const { value } = await cachedFetch(id, SET_CARDS_CACHE, async () => {
    const set = await getJson<DexSetWithCards>(
      `${BASE_URL}/${parsed.language}/sets/${encodeURIComponent(parsed.id)}`,
      { signal, ...REQUEST },
    );
    if (!set?.id || !Array.isArray(set.cards)) throw new ApiError('badResponse');
    const info = toDexSet(set);
    return set.cards.map((brief) =>
      buildCard({ ...brief, set: info }, info, null, parsed.language),
    );
  });
  return value;
}

export async function findDexCardFor(card: Card, signal?: AbortSignal): Promise<DexCard | null> {
  const parsed = parseDexId(card.id);
  if (parsed) return getDexCard(parsed.language, parsed.id, signal).catch(() => null);
  const sets = await loadDexSets('en', signal).catch(() => null);
  if (!sets) return null;
  const name = normalizeText(card.set.name);
  const total = card.set.printedTotal ?? card.set.total;
  const real = sets.filter((set) => !isDigitalSet(set.id));
  const byName = real.filter((set) => normalizeText(set.name) === name);
  const set =
    (byName.length === 1 ? byName[0] : byName.find((entry) => entry.cardCount.official === total)) ??
    real.find((entry) => {
      const other = normalizeText(entry.name);
      return (other.startsWith(`${name} `) || name.startsWith(`${other} `)) && entry.cardCount.official === total;
    });
  if (!set) return null;
  return findDexSetCard('en', set.id, card.number, signal).catch(() => null);
}

export function dexTcgplayer(card: DexCard): TcgPlayer | undefined {
  return tcgplayerPrices(card);
}

export function dexProductId(card: DexCard): number | null {
  if (card.thirdParty?.tcgplayer) return card.thirdParty.tcgplayer;
  for (const value of Object.values(card.pricing?.tcgplayer ?? {})) {
    if (value && typeof value === 'object' && typeof value.productId === 'number') return value.productId;
  }
  return null;
}

export async function matchPtcgSet(set: DexSet, signal?: AbortSignal): Promise<SetInfo | null> {
  const sets = await Promise.race([
    loadSets(signal).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SET_MATCH_TIMEOUT_MS)),
  ]);
  if (!sets) return null;
  const name = normalizeText(set.name);
  const official = set.cardCount.official;
  const code = set.abbreviation?.official?.toUpperCase() ?? null;
  const released = set.releaseDate?.replace(/-/g, '/') ?? null;
  const sameTotal = (candidate: SetInfo) => candidate.printedTotal === official;
  const byName = sets.filter((candidate) => normalizeText(candidate.name) === name);
  if (byName.length === 1) return byName[0] ?? null;
  return (
    byName.find(sameTotal) ??
    sets.find((candidate) => code !== null && candidate.ptcgoCode?.toUpperCase() === code && sameTotal(candidate)) ??
    sets.find((candidate) => released !== null && candidate.releaseDate === released && sameTotal(candidate)) ??
    sets.find((candidate) => {
      const other = normalizeText(candidate.name);
      return other.length > 2 && (name.startsWith(`${other} `) || other.startsWith(`${name} `)) && sameTotal(candidate);
    }) ??
    null
  );
}

function buildCard(card: DexCard, set: DexSet, ptcgSet: SetInfo | null, language: DexLanguage): Card {
  const number = printedNumber(card.localId);
  const image = card.image ?? null;
  const isPokemon = /^pok/i.test(card.category ?? '');
  return {
    id: ptcgSet ? `${ptcgSet.id}-${number}` : dexCardId(language, card.id),
    name: card.name,
    number,
    rarity: rarityLabel(card),
    set: ptcgSet ? fromPtcgSet(ptcgSet) : fromDexSet(set, language),
    images: {
      small: image ? `${image}/low.png` : '',
      large: image ? `${image}/high.png` : '',
    },
    tcgplayer: tcgplayerPrices(card),
    cardmarket: cardmarketPrices(card),
    supertype: isPokemon ? 'Pokémon' : card.category,
    subtypes: subtypes(card),
    hp: card.hp ? String(card.hp) : undefined,
    types: card.types,
    evolvesFrom: card.evolveFrom,
    abilities: card.abilities?.map((ability) => ({ name: ability.name, text: ability.effect, type: ability.type })),
    attacks: card.attacks?.map(toAttack),
    rules: card.effect ? [card.effect] : undefined,
    weaknesses: card.weaknesses?.map((entry) => ({ type: entry.type, value: entry.value ?? '' })),
    resistances: card.resistances?.map((entry) => ({ type: entry.type, value: entry.value ?? '' })),
    retreatCost: card.retreat ? Array.from({ length: card.retreat }, () => 'Colorless') : undefined,
    convertedRetreatCost: card.retreat,
    artist: card.illustrator,
    flavorText: card.description,
    nationalPokedexNumbers: card.dexId,
    regulationMark: card.regulationMark,
    legalities: card.legal
      ? {
          standard: card.legal.standard ? 'Legal' : undefined,
          expanded: card.legal.expanded ? 'Legal' : undefined,
        }
      : undefined,
  };
}

function fromPtcgSet(set: SetInfo): CardSet {
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    printedTotal: set.printedTotal,
    total: set.total,
    releaseDate: set.releaseDate,
    ptcgoCode: set.ptcgoCode ?? undefined,
    images: { logo: set.logo, symbol: set.symbol },
  };
}

function fromDexSet(set: DexSet, language: DexLanguage): CardSet {
  return {
    id: dexCardId(language, set.id),
    name: set.name,
    series: set.serie?.name ?? '',
    printedTotal: set.cardCount.official,
    total: set.cardCount.total,
    releaseDate: (set.releaseDate ?? '').replace(/-/g, '/'),
    ptcgoCode: set.abbreviation?.official,
    legalities: set.legal
      ? { standard: set.legal.standard ? 'Legal' : undefined, expanded: set.legal.expanded ? 'Legal' : undefined }
      : undefined,
    images: {
      logo: (language === 'ja' ? japaneseLogoFor(set.id, set.name) : null) ?? (set.logo ? `${set.logo}.png` : ''),
      symbol: set.symbol ? `${set.symbol}.png` : '',
    },
  };
}

function toDexSet(set: DexSetWithCards | DexSetBrief): DexSet {
  const full = set as DexSet;
  return {
    id: set.id,
    name: set.name,
    logo: set.logo,
    symbol: set.symbol,
    cardCount: set.cardCount,
    releaseDate: full.releaseDate,
    serie: full.serie,
    abbreviation: full.abbreviation,
    legal: full.legal,
  };
}

async function fetchCard(url: string, signal?: AbortSignal): Promise<DexCard> {
  const card = await getJson<DexCard>(url, { signal, ...REQUEST });
  if (!card?.id || !card.set) throw new ApiError('badResponse');
  return card;
}

function localIdCandidates(number: string): string[] {
  const trimmed = number.trim().toUpperCase();
  const numeric = /^\d+$/.test(trimmed);
  const plain = numeric ? String(Number.parseInt(trimmed, 10)) : trimmed;
  const candidates = [plain, trimmed, numeric ? plain.padStart(3, '0') : trimmed.replace(/^([A-Z]+)(\d)$/, '$10$2')];
  return candidates.filter((value, index) => value && candidates.indexOf(value) === index);
}

function printedNumber(localId: string): string {
  return /^\d+$/.test(localId) ? String(Number.parseInt(localId, 10)) : localId;
}

function toAttack(attack: DexAttack): CardAttack {
  return {
    name: attack.name,
    cost: attack.cost,
    convertedEnergyCost: attack.cost?.length,
    damage: attack.damage === undefined ? undefined : String(attack.damage),
    text: attack.effect,
  };
}

function subtypes(card: DexCard): string[] | undefined {
  const values = [card.stage?.replace(/^Stage(\d)$/, 'Stage $1'), card.suffix].filter(
    (value): value is string => Boolean(value),
  );
  return values.length > 0 ? values : undefined;
}

function rarityLabel(card: DexCard): string | undefined {
  if (!card.rarity || /^none$/i.test(card.rarity)) return undefined;
  const titled = card.rarity.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
  if (titled === 'Rare' && card.variants?.holo && !card.variants.normal) return 'Rare Holo';
  return titled;
}

function tcgplayerPrices(card: DexCard): TcgPlayer | undefined {
  const source = card.pricing?.tcgplayer;
  if (!source) return undefined;
  const prices: Record<string, TcgPlayerPrice> = {};
  let productId = card.thirdParty?.tcgplayer;
  for (const [key, value] of Object.entries(source)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as DexTcgVariantPrice;
    productId = productId ?? entry.productId;
    prices[camelVariant(key)] = {
      low: entry.lowPrice ?? null,
      mid: entry.midPrice ?? null,
      high: entry.highPrice ?? null,
      market: entry.marketPrice ?? null,
      directLow: entry.directLowPrice ?? null,
    };
  }
  if (Object.keys(prices).length === 0) return undefined;
  return {
    url: productId ? `https://www.tcgplayer.com/product/${productId}` : 'https://www.tcgplayer.com/',
    updatedAt: source.updated ? source.updated.slice(0, 10).replace(/-/g, '/') : undefined,
    prices,
  };
}

function cardmarketPrices(card: DexCard): Cardmarket | undefined {
  const source = card.pricing?.cardmarket;
  if (!source || source.unit !== 'EUR') return undefined;
  const id = source.idProduct ?? card.thirdParty?.cardmarket;
  return {
    url: id ? `https://www.cardmarket.com/en/Pokemon/Products?idProduct=${id}` : 'https://www.cardmarket.com/',
    updatedAt: source.updated ? source.updated.slice(0, 10).replace(/-/g, '/') : undefined,
    prices: {
      averageSellPrice: source.avg ?? null,
      lowPrice: source.low ?? null,
      trendPrice: source.trend ?? null,
      avg1: source.avg1 ?? null,
      avg7: source.avg7 ?? null,
      avg30: source.avg30 ?? null,
    },
  };
}

function camelVariant(key: string): string {
  return key
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}
