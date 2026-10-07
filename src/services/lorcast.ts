import type { Card, CardPage, TcgPlayerPrice } from '@/types/card';
import type { GameSet } from '@/types/gameSet';
import { gameIdPrefix, priceNumber, slashDate } from '@/utils/game';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson, toQueryString } from './http';
import { settleInBatches } from './tcgcsv';

const BASE_URL = 'https://api.lorcast.com/v0';
const PREFIX = gameIdPrefix('lorcana');
const SET_PREFIX = `${PREFIX}set-`;
const HOUR = 60 * 60 * 1000;
const SEARCH_CACHE: CachePolicy = { bucket: 'lor-search', ttlMs: 6 * HOUR, maxEntries: 30 };
const CARD_CACHE: CachePolicy = { bucket: 'lor-card', ttlMs: 6 * HOUR, maxEntries: 200 };
const SETS_CACHE: CachePolicy = { bucket: 'lor-sets', ttlMs: 24 * HOUR, maxEntries: 1 };
const SET_CARDS_CACHE: CachePolicy = { bucket: 'lor-set-cards', ttlMs: 12 * HOUR, maxEntries: 12 };

type LorcastSet = {
  id?: string;
  name: string;
  code: string;
  released_at?: string | null;
  prereleased_at?: string | null;
};

type LorcastCard = {
  name: string;
  version?: string | null;
  collector_number: string;
  rarity?: string;
  released_at?: string;
  type?: string[];
  classifications?: string[] | null;
  ink?: string | null;
  cost?: number;
  strength?: number | null;
  willpower?: number | null;
  lore?: number | null;
  text?: string | null;
  flavor_text?: string | null;
  illustrators?: string[];
  tcgplayer_id?: number | null;
  image_uris?: { digital?: { small?: string; normal?: string; large?: string } };
  set: { id: string; code: string; name: string };
  prices?: { usd?: string | null; usd_foil?: string | null };
};

export function isLorcastId(id: string): boolean {
  return id.startsWith(PREFIX) && !id.startsWith(SET_PREFIX);
}

export async function getLorcastSets(signal?: AbortSignal): Promise<GameSet[]> {
  const { value } = await cachedFetch('all', SETS_CACHE, async () =>
    listOf<LorcastSet>(await getJson<unknown>(`${BASE_URL}/sets`, { signal })),
  );
  return value
    .map((set) => ({
      id: `${SET_PREFIX}${set.code}`,
      game: 'lorcana' as const,
      code: set.code,
      name: set.name,
      releaseDate: slashDate(set.released_at ?? set.prereleased_at),
      total: 0,
      type: /^\d+$/.test(set.code) ? 'Main set' : 'Special',
      icon: null,
      iconIsSymbol: false,
    }))
    .sort((first, second) => second.releaseDate.localeCompare(first.releaseDate));
}

export async function getLorcastSetCards(setId: string, signal?: AbortSignal): Promise<Card[]> {
  const code = setId.slice(SET_PREFIX.length);
  const { value } = await cachedFetch(code, SET_CARDS_CACHE, async () => {
    const cards = listOf<LorcastCard>(
      await getJson<unknown>(`${BASE_URL}/sets/${encodeURIComponent(code)}/cards`, { signal, timeoutMs: 20_000 }),
    ).map(toCard);
    if (cards.length === 0) throw new ApiError('notFound');
    return cards.sort((first, second) => first.number.localeCompare(second.number, undefined, { numeric: true }));
  });
  return value;
}

export async function searchLorcastQuery(q: string, signal?: AbortSignal): Promise<Card[]> {
  return (await searchLorcast(q, 1, signal)).cards;
}

function listOf<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  const results = (response as { results?: unknown } | null)?.results;
  if (Array.isArray(results)) return results as T[];
  throw new ApiError('badResponse');
}

export async function searchLorcast(text: string, page: number, signal?: AbortSignal): Promise<CardPage> {
  const { value, stale } = await cachedFetch(
    text,
    SEARCH_CACHE,
    async () => {
      try {
        const response = await getJson<unknown>(`${BASE_URL}/cards/search?${toQueryString({ q: text })}`, { signal });
        return listOf<LorcastCard>(response).map(toCard).sort((first, second) => second.set.releaseDate.localeCompare(first.set.releaseDate));
      } catch (error) {
        if (error instanceof ApiError && (error.kind === 'notFound' || error.status === 400)) return [];
        throw error;
      }
    },
  );
  return { cards: page === 1 ? value : [], page, pageSize: Math.max(value.length, 1), totalCount: value.length, stale };
}

export async function getLorcastCard(id: string, signal?: AbortSignal, options: { force?: boolean } = {}): Promise<Card> {
  const { value } = await cachedFetch(
    id,
    CARD_CACHE,
    async () => {
      const [set, number] = splitId(id);
      if (!set || !number) throw new ApiError('notFound');
      return toCard(await getJson<LorcastCard>(`${BASE_URL}/cards/${encodeURIComponent(set)}/${encodeURIComponent(number)}`, { signal }));
    },
    options,
  );
  return value;
}

export async function getLorcastCards(ids: string[]): Promise<{ cards: Card[]; failed: number }> {
  const settled = await settleInBatches(ids, (id) => getLorcastCard(id, undefined, { force: true }));
  const cards = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  return { cards, failed: settled.length - cards.length };
}

function splitId(id: string): [string, string] {
  const rest = id.slice(PREFIX.length);
  const split = rest.indexOf('-');
  return split > 0 ? [rest.slice(0, split), rest.slice(split + 1)] : ['', ''];
}

function toCard(card: LorcastCard): Card {
  const images = card.image_uris?.digital ?? {};
  const prices: Record<string, TcgPlayerPrice> = {};
  const usd = priceNumber(card.prices?.usd);
  const foil = priceNumber(card.prices?.usd_foil);
  if (usd !== null) prices.normal = { market: usd };
  if (foil !== null) prices.foil = { market: foil };
  const stats = [
    card.cost !== undefined ? `Cost ${card.cost}` : null,
    card.strength != null ? `Strength ${card.strength}` : null,
    card.willpower != null ? `Willpower ${card.willpower}` : null,
    card.lore != null ? `Lore ${card.lore}` : null,
  ].filter(Boolean);
  return {
    id: `${PREFIX}${card.set.code}-${card.collector_number}`,
    game: 'lorcana',
    name: card.version ? `${card.name} - ${card.version}` : card.name,
    number: card.collector_number,
    rarity: card.rarity?.replace(/_/g, ' '),
    finishTags: card.rarity ? [card.rarity.toLowerCase().replace(/_/g, ' ')] : [],
    set: {
      id: `${PREFIX}set-${card.set.code}`,
      name: card.set.name,
      series: 'Disney Lorcana',
      total: 0,
      releaseDate: slashDate(card.released_at),
      ptcgoCode: card.set.code,
      images: { symbol: '', logo: '' },
    },
    images: { small: images.small ?? images.normal ?? '', large: images.large ?? images.normal ?? '' },
    tcgplayer: {
      url: card.tcgplayer_id
        ? `https://www.tcgplayer.com/product/${card.tcgplayer_id}`
        : `https://www.tcgplayer.com/search/lorcana-tcg/product?q=${encodeURIComponent(card.name)}`,
      prices,
    },
    supertype: card.type?.join(' · '),
    subtypes: [card.ink, ...(card.classifications ?? [])].filter((value): value is string => Boolean(value)),
    rules: [...(card.text ? card.text.split('\n').filter(Boolean) : []), ...(stats.length > 0 ? [stats.join(' · ')] : [])],
    flavorText: card.flavor_text ?? undefined,
    artist: card.illustrators?.join(', '),
  };
}
