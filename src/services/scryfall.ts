import type { Card, CardPage, TcgPlayerPrice } from '@/types/card';
import { gameIdPrefix, priceNumber, slashDate } from '@/utils/game';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson, postJson, toQueryString } from './http';

const BASE_URL = 'https://api.scryfall.com';
const PREFIX = gameIdPrefix('mtg');
const HEADERS = { 'User-Agent': 'PullCheck/1.0 (iOS; Expo)' };
const COLLECTION_LIMIT = 75;
const HOUR = 60 * 60 * 1000;
const SEARCH_CACHE: CachePolicy = { bucket: 'mtg-search', ttlMs: 6 * HOUR, maxEntries: 30 };
const CARD_CACHE: CachePolicy = { bucket: 'mtg-card', ttlMs: 6 * HOUR, maxEntries: 200 };

type ImageUris = {
  small?: string;
  normal?: string;
  large?: string;
};

type ScryfallFace = {
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  image_uris?: ImageUris;
};

type ScryfallCard = ScryfallFace & {
  id: string;
  name: string;
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
  card_faces?: ScryfallFace[];
  prices?: Record<string, string | null>;
  purchase_uris?: { tcgplayer?: string; cardmarket?: string };
};

type ScryfallList = {
  data: ScryfallCard[];
  total_cards?: number;
  has_more?: boolean;
  not_found?: unknown[];
};

const VARIANT_PRICES: [string, string][] = [
  ['usd', 'normal'],
  ['usd_foil', 'foil'],
  ['usd_etched', 'etchedFoil'],
];

export function isScryfallId(id: string): boolean {
  return id.startsWith(PREFIX);
}

export async function searchScryfall(text: string, page: number, signal?: AbortSignal): Promise<CardPage> {
  const { value, stale } = await cachedFetch(
    `${text}|${page}`,
    SEARCH_CACHE,
    async () => {
      const query = toQueryString({ q: `${text} game:paper`, unique: 'prints', order: 'released', dir: 'desc', page });
      try {
        const response = await getJson<ScryfallList>(`${BASE_URL}/cards/search?${query}`, { signal, headers: HEADERS });
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
      const response = await postJson<ScryfallList>(
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

function toCard(card: ScryfallCard): Card {
  const front = card.card_faces?.[0];
  const images = card.image_uris ?? front?.image_uris ?? {};
  const prices: Record<string, TcgPlayerPrice> = {};
  for (const [field, variant] of VARIANT_PRICES) {
    const market = priceNumber(card.prices?.[field]);
    if (market !== null) prices[variant] = { market };
  }
  const eur = priceNumber(card.prices?.eur) ?? priceNumber(card.prices?.eur_foil);
  const faces = card.card_faces?.length ? card.card_faces : [card];
  return {
    id: `${PREFIX}${card.id}`,
    game: 'mtg',
    name: card.name,
    number: card.collector_number,
    rarity: card.rarity ? capitalize(card.rarity) : undefined,
    set: {
      id: `${PREFIX}set-${card.set}`,
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
    },
    tcgplayer: { url: card.purchase_uris?.tcgplayer ?? card.scryfall_uri ?? '', prices },
    cardmarket: eur !== null ? { url: card.purchase_uris?.cardmarket ?? '', prices: { trendPrice: eur } } : undefined,
    supertype: card.type_line,
    rules: [
      ...(card.mana_cost ? [`Cost ${card.mana_cost}`] : []),
      ...faces.flatMap((face) => [...(face.oracle_text ? face.oracle_text.split('\n') : []), ...faceStats(face)]),
    ],
    flavorText: front?.flavor_text ?? card.flavor_text,
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
