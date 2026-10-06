import type { Card, CardPage } from '@/types/card';

import { type CachePolicy, type Cached, cachedFetch } from './cache';
import { buildNameQuery, normalizeCardName } from './cardQuery';
import { getExtraCard, getExtraSetCards, isExtraCardId, isExtraSetId } from './extraCards';
import { ApiError, getJson, toQueryString, withAbort } from './http';

const BASE_URL = 'https://api.pokemontcg.io/v2';
const CARD_FIELDS =
  'id,name,number,rarity,artist,hp,types,supertype,subtypes,regulationMark,set,images,tcgplayer,cardmarket';
const SEARCH_PAGE_SIZE = 20;
const SIX_HOURS = 6 * 60 * 60 * 1000;

const SET_PAGE_SIZE = 250;
const MAX_SET_PAGES = 4;

const PAGE_CACHE: CachePolicy = { bucket: 'cards', ttlMs: SIX_HOURS, maxEntries: 60 };
const CARD_CACHE: CachePolicy = { bucket: 'card', ttlMs: SIX_HOURS, maxEntries: 300 };
const SET_CARDS_CACHE: CachePolicy = { bucket: 'set-cards', ttlMs: 2 * SIX_HOURS, maxEntries: 12 };

type ListResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

type ItemResponse<T> = {
  data: T;
};

type FetchOptions = {
  force?: boolean;
};

const knownCards = new Map<string, Card>();

export async function searchCardsByName(
  name: string,
  page: number,
  signal?: AbortSignal,
): Promise<CardPage> {
  const normalizedName = normalizeCardName(name);
  if (!normalizedName) {
    return { cards: [], page, pageSize: SEARCH_PAGE_SIZE, totalCount: 0 };
  }
  return queryCards(buildNameQuery(normalizedName), page, SEARCH_PAGE_SIZE, signal);
}

export async function queryCards(
  q: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
  options: FetchOptions = {},
): Promise<CardPage> {
  const { value, stale } = await cachedFetch(
    `${q}|${page}|${pageSize}`,
    PAGE_CACHE,
    async () => {
      const query = toQueryString({
        q,
        page,
        pageSize,
        orderBy: '-set.releaseDate,number',
        select: CARD_FIELDS,
      });
      const response = await getJson<ListResponse<Card>>(`${BASE_URL}/cards?${query}`, { signal });
      if (!Array.isArray(response.data)) throw new ApiError('badResponse');
      return {
        cards: response.data,
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
      };
    },
    options,
  );

  for (const card of value.cards) {
    if (!knownCards.has(card.id)) knownCards.set(card.id, card);
  }
  return { ...value, stale };
}

export async function getCard(id: string, signal?: AbortSignal, options: FetchOptions = {}): Promise<Card> {
  if (isExtraCardId(id)) {
    const card = await withAbort(getExtraCard(id, options), signal);
    knownCards.set(card.id, card);
    return card;
  }
  const { value } = await cachedFetch(
    id,
    CARD_CACHE,
    async () => {
      const response = await getJson<ItemResponse<Card>>(
        `${BASE_URL}/cards/${encodeURIComponent(id)}`,
        { signal },
      );
      if (!response.data?.id) throw new ApiError('badResponse');
      return response.data;
    },
    options,
  );
  knownCards.set(value.id, value);
  return value;
}

export async function getSetCards(setId: string, signal?: AbortSignal, options: FetchOptions = {}): Promise<Cached<Card[]>> {
  if (isExtraSetId(setId)) {
    const cards = await withAbort(getExtraSetCards(setId, options), signal);
    if (cards.length === 0) throw new ApiError('notFound');
    rememberCards(cards);
    return { value: cards, stale: false };
  }
  const result = await cachedFetch(
    setId,
    SET_CARDS_CACHE,
    async () => {
      const cards: Card[] = [];
      for (let page = 1; page <= MAX_SET_PAGES; page += 1) {
        const query = toQueryString({
          q: `set.id:${setId}`,
          page,
          pageSize: SET_PAGE_SIZE,
          select: CARD_FIELDS,
        });
        const response = await getJson<ListResponse<Card>>(`${BASE_URL}/cards?${query}`, {
          signal,
          timeoutMs: 25_000,
          retryBudgetMs: 60_000,
        });
        if (!Array.isArray(response.data)) throw new ApiError('badResponse');
        cards.push(...response.data);
        if (response.data.length < SET_PAGE_SIZE || cards.length >= response.totalCount) break;
      }
      if (cards.length === 0) throw new ApiError('badResponse');
      return cards;
    },
    options,
  );
  rememberCards(result.value);
  return result;
}

export function getKnownCard(id: string): Card | null {
  return knownCards.get(id) ?? null;
}

export function rememberCards(cards: Card[]) {
  for (const card of cards) knownCards.set(card.id, card);
}
