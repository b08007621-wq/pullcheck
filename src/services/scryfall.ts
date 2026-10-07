import type { Card, CardPage, TcgPlayerPrice } from '@/types/card';
import type { GameSet } from '@/types/gameSet';
import { gameIdPrefix, priceNumber, slashDate } from '@/utils/game';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson, postJson, toQueryString } from './http';

const BASE_URL = 'https://api.scryfall.com';
const BACKS_URL = 'https://backs.scryfall.io/large';
const DEFAULT_BACK_ID = '0aeebaf5-8c7d-4636-9e82-8c27447861f7';
const PREFIX = gameIdPrefix('mtg');
const SET_PREFIX = `${PREFIX}set-`;
const HEADERS = { 'User-Agent': 'PullCheck/1.0 (iOS; Expo)' };
const COLLECTION_LIMIT = 75;
const MAX_SET_PAGES = 5;
const HOUR = 60 * 60 * 1000;
const SEARCH_CACHE: CachePolicy = { bucket: 'mtg-search', ttlMs: 6 * HOUR, maxEntries: 30 };
const CARD_CACHE: CachePolicy = { bucket: 'mtg-card', ttlMs: 6 * HOUR, maxEntries: 200 };
const SETS_CACHE: CachePolicy = { bucket: 'mtg-sets', ttlMs: 24 * HOUR, maxEntries: 1 };
const SET_CARDS_CACHE: CachePolicy = { bucket: 'mtg-set-cards', ttlMs: 12 * HOUR, maxEntries: 12 };
const PAPER_SET_TYPES = new Set([
  'core',
  'expansion',
  'masters',
  'draft_innovation',
  'commander',
  'funny',
  'starter',
  'box',
  'from_the_vault',
  'spellbook',
  'premium_deck',
  'duel_deck',
  'planechase',
  'archenemy',
  'masterpiece',
  'arsenal',
  'promo',
]);

export const MTG_LANGUAGES = ['en', 'ja', 'de', 'fr', 'it', 'es', 'pt', 'ko', 'ru', 'zhs', 'zht'] as const;

export type MtgLanguage = (typeof MTG_LANGUAGES)[number];

type ImageUris = {
  small?: string;
  normal?: string;
  large?: string;
};

type ScryfallFace = {
  name?: string;
  printed_name?: string;
  oracle_text?: string;
  printed_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  image_uris?: ImageUris;
};

type ScryfallCard = ScryfallFace & {
  id: string;
  name: string;
  lang?: string;
  set: string;
  set_name: string;
  set_type?: string;
  collector_number: string;
  rarity?: string;
  released_at?: string;
  type_line?: string;
  mana_cost?: string;
  artist?: string;
  scryfall_uri?: string;
  card_back_id?: string;
  border_color?: string;
  full_art?: boolean;
  finishes?: string[];
  frame_effects?: string[];
  promo_types?: string[];
  card_faces?: ScryfallFace[];
  prices?: Record<string, string | null>;
  purchase_uris?: { tcgplayer?: string; cardmarket?: string };
};

type ScryfallList<T> = {
  data: T[];
  total_cards?: number;
  has_more?: boolean;
  next_page?: string;
};

type ScryfallSet = {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  card_count: number;
  digital: boolean;
  icon_svg_uri?: string;
  parent_set_code?: string;
};

const VARIANT_PRICES: [string, string][] = [
  ['usd', 'normal'],
  ['usd_foil', 'foil'],
  ['usd_etched', 'etchedFoil'],
];

export function isScryfallId(id: string): boolean {
  return id.startsWith(PREFIX) && !id.startsWith(SET_PREFIX);
}

export async function searchScryfall(
  text: string,
  page: number,
  signal?: AbortSignal,
  lang: MtgLanguage = 'en',
): Promise<CardPage> {
  const q = `${text} game:paper${lang === 'en' ? '' : ` lang:${lang}`}`;
  return searchQuery(q, page, signal, 'released', 'desc');
}

export async function searchScryfallQuery(q: string, order: string, dir: 'asc' | 'desc', signal?: AbortSignal): Promise<Card[]> {
  return (await searchQuery(q, 1, signal, order, dir)).cards;
}

async function searchQuery(q: string, page: number, signal: AbortSignal | undefined, order: string, dir: 'asc' | 'desc'): Promise<CardPage> {
  const { value, stale } = await cachedFetch(
    `${q}|${order}|${dir}|${page}`,
    SEARCH_CACHE,
    async () => {
      const query = toQueryString({ q, unique: 'prints', order, dir, page });
      try {
        const response = await getJson<ScryfallList<ScryfallCard>>(`${BASE_URL}/cards/search?${query}`, { signal, headers: HEADERS });
        if (!Array.isArray(response.data)) throw new ApiError('badResponse');
        const cards = response.data.map(toCard);
        const totalCount = response.total_cards ?? cards.length;
        return { cards, page, pageSize: response.has_more ? cards.length : Math.max(totalCount, 1), totalCount };
      } catch (error) {
        if (error instanceof ApiError && (error.kind === 'notFound' || error.status === 400)) {
          return { cards: [], page, pageSize: 1, totalCount: 0 };
        }
        throw error;
      }
    },
  );
  return { ...value, stale };
}

export async function getScryfallCard(id: string, signal?: AbortSignal, options: { force?: boolean } = {}): Promise<Card> {
  const { value } = await cachedFetch(
    id,
    CARD_CACHE,
    async () => toCard(await getJson<ScryfallCard>(`${BASE_URL}/cards/${encodeURIComponent(id.slice(PREFIX.length))}`, { signal, headers: HEADERS })),
    options,
  );
  return value;
}

export async function getScryfallCards(ids: string[]): Promise<{ cards: Card[]; failed: number }> {
  const cards: Card[] = [];
  let failed = 0;
  for (let index = 0; index < ids.length; index += COLLECTION_LIMIT) {
    const chunk = ids.slice(index, index + COLLECTION_LIMIT);
    try {
      const response = await postJson<ScryfallList<ScryfallCard>>(
        `${BASE_URL}/cards/collection`,
        { identifiers: chunk.map((id) => ({ id: id.slice(PREFIX.length) })) },
        { headers: HEADERS },
      );
      if (!Array.isArray(response.data)) throw new ApiError('badResponse');
      cards.push(...response.data.map(toCard));
    } catch {
      failed += 1;
    }
  }
  return { cards, failed };
}

export async function getScryfallSets(signal?: AbortSignal): Promise<GameSet[]> {
  const { value } = await cachedFetch('all', SETS_CACHE, async () => {
    const response = await getJson<ScryfallList<ScryfallSet>>(`${BASE_URL}/sets`, { signal, headers: HEADERS, timeoutMs: 20_000 });
    if (!Array.isArray(response.data)) throw new ApiError('badResponse');
    return response.data;
  });
  return value
    .filter((set) => !set.digital && set.card_count > 0 && PAPER_SET_TYPES.has(set.set_type))
    .map((set) => ({
      id: `${SET_PREFIX}${set.code}`,
      game: 'mtg' as const,
      code: set.code.toUpperCase(),
      name: set.name,
      releaseDate: slashDate(set.released_at),
      total: set.card_count,
      type: capitalize(set.set_type.replace(/_/g, ' ')),
      icon: set.icon_svg_uri ?? null,
      iconIsSymbol: true,
    }))
    .filter((set, index, list) => list.findIndex((other) => other.id === set.id) === index)
    .sort((first, second) => second.releaseDate.localeCompare(first.releaseDate));
}

export async function getScryfallSetCards(setId: string, signal?: AbortSignal): Promise<Card[]> {
  const code = setId.slice(SET_PREFIX.length);
  const { value } = await cachedFetch(code, SET_CARDS_CACHE, async () => {
    const cards: Card[] = [];
    let url: string | undefined = `${BASE_URL}/cards/search?${toQueryString({ q: `e:${code}`, unique: 'prints', order: 'set', dir: 'asc' })}`;
    for (let page = 0; url && page < MAX_SET_PAGES; page += 1) {
      const response: ScryfallList<ScryfallCard> = await getJson<ScryfallList<ScryfallCard>>(url, {
        signal,
        headers: HEADERS,
        timeoutMs: 20_000,
      });
      if (!Array.isArray(response.data)) throw new ApiError('badResponse');
      cards.push(...response.data.map(toCard));
      url = response.has_more ? response.next_page : undefined;
    }
    if (cards.length === 0) throw new ApiError('notFound');
    return cards;
  });
  return value;
}

export function scryfallSetId(code: string): string {
  return `${SET_PREFIX}${code.toLowerCase()}`;
}

function toCard(card: ScryfallCard): Card {
  const faces = card.card_faces?.length ? card.card_faces : [card];
  const front = faces[0] ?? card;
  const images = card.image_uris ?? front.image_uris ?? {};
  const backFace = card.image_uris ? null : card.card_faces?.[1]?.image_uris;
  const backId = card.card_back_id ?? DEFAULT_BACK_ID;
  const prices: Record<string, TcgPlayerPrice> = {};
  for (const [field, variant] of VARIANT_PRICES) {
    const market = priceNumber(card.prices?.[field]);
    if (market !== null) prices[variant] = { market };
  }
  const eur = priceNumber(card.prices?.eur) ?? priceNumber(card.prices?.eur_foil);
  const english = !card.lang || card.lang === 'en';
  const printedName = english ? null : faces.map((face) => face.printed_name).filter(Boolean).join(' // ');
  return {
    id: `${PREFIX}${card.id}`,
    game: 'mtg',
    lang: card.lang ?? 'en',
    name: printedName || card.name,
    number: card.collector_number,
    rarity: card.rarity ? capitalize(card.rarity) : undefined,
    finishTags: [
      ...(card.promo_types ?? []),
      ...(card.frame_effects ?? []),
      ...(card.border_color === 'borderless' ? ['borderless'] : []),
      ...(card.full_art ? ['fullart'] : []),
      ...(card.finishes?.length === 1 ? [`only-${card.finishes[0]}`] : []),
    ],
    set: {
      id: `${SET_PREFIX}${card.set}`,
      name: card.set_name,
      series: card.set_type ? capitalize(card.set_type.replace(/_/g, ' ')) : 'Magic',
      total: 0,
      releaseDate: slashDate(card.released_at),
      ptcgoCode: card.set.toUpperCase(),
      images: { symbol: '', logo: '' },
    },
    images: {
      small: images.small ?? images.normal ?? '',
      large: images.large ?? images.normal ?? images.small ?? '',
      back: backFace?.large ?? backFace?.normal ?? `${BACKS_URL}/${backId.charAt(0)}/${backId.charAt(1)}/${backId}.jpg`,
    },
    tcgplayer: { url: card.purchase_uris?.tcgplayer ?? card.scryfall_uri ?? '', prices },
    cardmarket: eur !== null ? { url: card.purchase_uris?.cardmarket ?? '', prices: { trendPrice: eur } } : undefined,
    supertype: card.type_line,
    rules: [
      ...(card.mana_cost ? [`Cost ${card.mana_cost}`] : []),
      ...faces.flatMap((face) => {
        const text = (english ? face.oracle_text : face.printed_text ?? face.oracle_text) ?? '';
        return [...(text ? text.split('\n') : []), ...faceStats(face)];
      }),
    ],
    flavorText: front.flavor_text ?? card.flavor_text,
    artist: card.artist,
  };
}

function faceStats(face: ScryfallFace): string[] {
  if (face.power !== undefined && face.toughness !== undefined) return [`Power / Toughness ${face.power}/${face.toughness}`];
  if (face.loyalty !== undefined) return [`Loyalty ${face.loyalty}`];
  return [];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
