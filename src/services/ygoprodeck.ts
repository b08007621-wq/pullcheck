import type { Card, CardPage } from '@/types/card';
import { gameIdPrefix, priceNumber, slashDate } from '@/utils/game';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson, toQueryString } from './http';

const BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const PREFIX = gameIdPrefix('yugioh');
const PAGE_SIZE = 20;
const IDS_PER_REQUEST = 20;
const HOUR = 60 * 60 * 1000;
const SEARCH_CACHE: CachePolicy = { bucket: 'ygo-search', ttlMs: 6 * HOUR, maxEntries: 30 };
const CARD_CACHE: CachePolicy = { bucket: 'ygo-card', ttlMs: 6 * HOUR, maxEntries: 200 };

type YgoSet = {
  set_name: string;
  set_code: string;
  set_rarity?: string;
};

type YgoCard = {
  id: number;
  name: string;
  type?: string;
  desc?: string;
  atk?: number;
  def?: number;
  level?: number;
  linkval?: number;
  race?: string;
  attribute?: string;
  archetype?: string;
  card_sets?: YgoSet[];
  card_images?: { image_url: string; image_url_small: string }[];
  card_prices?: { tcgplayer_price?: string; cardmarket_price?: string }[];
  misc_info?: { tcg_date?: string; ocg_date?: string }[];
};

type YgoResponse = {
  data: YgoCard[];
  meta?: { total_rows?: number };
};

export function isYgoId(id: string): boolean {
  return id.startsWith(PREFIX);
}

export async function searchYgo(text: string, page: number, signal?: AbortSignal): Promise<CardPage> {
  const { value, stale } = await cachedFetch(
    `${text}|${page}`,
    SEARCH_CACHE,
    async () => {
      const query = toQueryString({ fname: text, num: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, sort: 'new', misc: 'yes' });
      const response = await fetchCards(`${BASE_URL}?${query}`, signal);
      const cards = response.data.map(toCard);
      return { cards, page, pageSize: PAGE_SIZE, totalCount: response.meta?.total_rows ?? cards.length };
    },
  );
  return { ...value, stale };
}

export async function getYgoCard(id: string, signal?: AbortSignal, options: { force?: boolean } = {}): Promise<Card> {
  const { value } = await cachedFetch(
    id,
    CARD_CACHE,
    async () => {
      const response = await fetchCards(`${BASE_URL}?${toQueryString({ id: id.slice(PREFIX.length), misc: 'yes' })}`, signal);
      const card = response.data[0];
      if (!card) throw new ApiError('notFound');
      return toCard(card);
    },
    options,
  );
  return value;
}

export async function getYgoCards(ids: string[]): Promise<{ cards: Card[]; failed: number }> {
  const cards: Card[] = [];
  let failed = 0;
  for (let index = 0; index < ids.length; index += IDS_PER_REQUEST) {
    const chunk = ids.slice(index, index + IDS_PER_REQUEST).map((id) => id.slice(PREFIX.length));
    try {
      const response = await fetchCards(`${BASE_URL}?${toQueryString({ id: chunk.join(','), misc: 'yes' })}`);
      cards.push(...response.data.map(toCard));
    } catch {
      failed += 1;
    }
  }
  return { cards, failed };
}

async function fetchCards(url: string, signal?: AbortSignal): Promise<YgoResponse> {
  try {
    const response = await getJson<YgoResponse>(url, { signal });
    if (!Array.isArray(response.data)) throw new ApiError('badResponse');
    return response;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return { data: [], meta: { total_rows: 0 } };
    throw error;
  }
}

function toCard(card: YgoCard): Card {
  const printing = card.card_sets?.[0];
  const image = card.card_images?.[0];
  const prices = card.card_prices?.[0];
  const usd = priceNumber(prices?.tcgplayer_price);
  const eur = priceNumber(prices?.cardmarket_price);
  const released = card.misc_info?.[0]?.tcg_date ?? card.misc_info?.[0]?.ocg_date;
  return {
    id: `${PREFIX}${card.id}`,
    game: 'yugioh',
    name: card.name,
    number: printing?.set_code ?? String(card.id),
    rarity: printing?.set_rarity,
    set: {
      id: `${PREFIX}set-${printing?.set_code.split('-')[0] ?? 'none'}`,
      name: printing?.set_name ?? 'Yu-Gi-Oh!',
      series: card.archetype ?? 'Yu-Gi-Oh!',
      total: 0,
      releaseDate: slashDate(released),
      images: { symbol: '', logo: '' },
    },
    images: { small: image?.image_url_small ?? image?.image_url ?? '', large: image?.image_url ?? '' },
    tcgplayer: {
      url: `https://www.tcgplayer.com/search/yugioh/product?q=${encodeURIComponent(card.name)}`,
      prices: usd !== null ? { normal: { market: usd } } : {},
    },
    cardmarket: eur !== null ? { url: '', prices: { trendPrice: eur } } : undefined,
    supertype: card.type,
    subtypes: [card.race, card.attribute].filter((value): value is string => Boolean(value)),
    rules: [...(card.desc ? card.desc.split('\n').filter(Boolean) : []), ...stats(card)],
  };
}

function stats(card: YgoCard): string[] {
  const parts = [
    card.level !== undefined ? `Level ${card.level}` : null,
    card.linkval !== undefined ? `Link ${card.linkval}` : null,
    card.atk !== undefined ? `ATK ${card.atk}` : null,
    card.def !== undefined ? `DEF ${card.def}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? [parts.join(' · ')] : [];
}
