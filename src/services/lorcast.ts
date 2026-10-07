import type { Card, CardPage, TcgPlayerPrice } from '@/types/card';
import { gameIdPrefix, priceNumber, slashDate } from '@/utils/game';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson, toQueryString } from './http';
import { settleInBatches } from './tcgcsv';

const BASE_URL = 'https://api.lorcast.com/v0';
const PREFIX = gameIdPrefix('lorcana');
const HOUR = 60 * 60 * 1000;
const SEARCH_CACHE: CachePolicy = { bucket: 'lor-search', ttlMs: 6 * HOUR, maxEntries: 30 };
const CARD_CACHE: CachePolicy = { bucket: 'lor-card', ttlMs: 6 * HOUR, maxEntries: 200 };

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
  return id.startsWith(PREFIX);
}

export async function searchLorcast(text: string, page: number, signal?: AbortSignal): Promise<CardPage> {
  const { value, stale } = await cachedFetch(
    text,
    SEARCH_CACHE,
    async () => {
      try {
        const response = await getJson<{ results: LorcastCard[] }>(
          `${BASE_URL}/cards/search?${toQueryString({ q: text })}`,
          { signal },
        );
        if (!Array.isArray(response.results)) throw new ApiError('badResponse');
        return response.results.map(toCard).sort((first, second) => second.set.releaseDate.localeCompare(first.set.releaseDate));
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
