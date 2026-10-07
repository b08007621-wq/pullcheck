import type { Card, CardPage } from '@/types/card';
import type { GameSet } from '@/types/gameSet';
import { gameIdPrefix, priceNumber, slashDate } from '@/utils/game';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson, toQueryString } from './http';

const BASE_URL = 'https://db.ygoprodeck.com/api/v7';
const SET_IMAGE_URL = 'https://images.ygoprodeck.com/images/sets';
const PREFIX = gameIdPrefix('yugioh');
const SET_PREFIX = `${PREFIX}set-`;
const PAGE_SIZE = 20;
const IDS_PER_REQUEST = 20;
const HOUR = 60 * 60 * 1000;
const SEARCH_CACHE: CachePolicy = { bucket: 'ygo-search', ttlMs: 6 * HOUR, maxEntries: 30 };
const CARD_CACHE: CachePolicy = { bucket: 'ygo-card', ttlMs: 6 * HOUR, maxEntries: 200 };
const SETS_CACHE: CachePolicy = { bucket: 'ygo-sets', ttlMs: 24 * HOUR, maxEntries: 1 };
const SET_CARDS_CACHE: CachePolicy = { bucket: 'ygo-set-cards', ttlMs: 12 * HOUR, maxEntries: 12 };

export const YGO_LANGUAGES = ['en', 'fr', 'de', 'it', 'pt'] as const;

export type YgoLanguage = (typeof YGO_LANGUAGES)[number];

type YgoPrinting = {
  set_name: string;
  set_code: string;
  set_rarity?: string;
  set_rarity_code?: string;
  set_price?: string;
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
  scale?: number;
  race?: string;
  attribute?: string;
  archetype?: string;
  card_sets?: YgoPrinting[];
  card_images?: { image_url: string; image_url_small: string }[];
  card_prices?: { tcgplayer_price?: string; cardmarket_price?: string }[];
  misc_info?: { tcg_date?: string; ocg_date?: string }[];
};

type YgoResponse = {
  data: YgoCard[];
  meta?: { total_rows?: number };
};

type YgoSetInfo = {
  set_name: string;
  set_code: string;
  num_of_cards?: number;
  tcg_date?: string;
  set_image?: string;
};

type ParsedId = {
  passcode: string;
  setCode: string | null;
  rarityCode: string | null;
  lang: YgoLanguage;
};

export function isYgoId(id: string): boolean {
  return id.startsWith(PREFIX) && !id.startsWith(SET_PREFIX);
}

export function ygoSetId(code: string): string {
  return `${SET_PREFIX}${code}`;
}

export async function searchYgo(
  text: string,
  page: number,
  signal?: AbortSignal,
  lang: YgoLanguage = 'en',
): Promise<CardPage> {
  const { value, stale } = await cachedFetch(
    `${lang}|${text}|${page}`,
    SEARCH_CACHE,
    async () => {
      const params: Record<string, string | number> = {
        fname: text,
        num: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        sort: 'new',
        misc: 'yes',
      };
      if (lang !== 'en') params.language = lang;
      const [response, dates] = await Promise.all([fetchCards(`${BASE_URL}/cardinfo.php?${toQueryString(params)}`, signal), setDates()]);
      const cards = response.data
        .flatMap((card) => toCards(card, lang, dates))
        .sort((first, second) => second.set.releaseDate.localeCompare(first.set.releaseDate));
      return { cards, page, pageSize: PAGE_SIZE, totalCount: response.meta?.total_rows ?? response.data.length };
    },
  );
  return { ...value, stale };
}

export async function getYgoCard(id: string, signal?: AbortSignal, options: { force?: boolean } = {}): Promise<Card> {
  const parsed = parseId(id);
  if (!parsed) throw new ApiError('notFound');
  const { value } = await cachedFetch(
    id,
    CARD_CACHE,
    async () => {
      const [response, dates] = await Promise.all([
        fetchCards(`${BASE_URL}/cardinfo.php?${toQueryString(idParams(parsed.passcode, parsed.lang))}`, signal),
        setDates(),
      ]);
      const card = response.data[0];
      if (!card) throw new ApiError('notFound');
      return pickPrinting(toCards(card, parsed.lang, dates), parsed);
    },
    options,
  );
  return value;
}

export async function getYgoCards(ids: string[]): Promise<{ cards: Card[]; failed: number }> {
  const groups = new Map<YgoLanguage, ParsedId[]>();
  for (const id of ids) {
    const parsed = parseId(id);
    if (!parsed) continue;
    groups.set(parsed.lang, [...(groups.get(parsed.lang) ?? []), parsed]);
  }
  const dates = await setDates().catch(() => new Map<string, string>());
  const cards: Card[] = [];
  let failed = 0;
  for (const [lang, wanted] of groups) {
    const passcodes = [...new Set(wanted.map((entry) => entry.passcode))];
    for (let index = 0; index < passcodes.length; index += IDS_PER_REQUEST) {
      const chunk = passcodes.slice(index, index + IDS_PER_REQUEST);
      try {
        const response = await fetchCards(`${BASE_URL}/cardinfo.php?${toQueryString(idParams(chunk.join(','), lang))}`);
        const byPasscode = new Map(response.data.map((card) => [String(card.id), toCards(card, lang, dates)]));
        for (const entry of wanted.filter((item) => chunk.includes(item.passcode))) {
          const printings = byPasscode.get(entry.passcode);
          if (printings?.length) cards.push(pickPrinting(printings, entry));
          else failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
  }
  return { cards, failed };
}

export async function getYgoSets(signal?: AbortSignal): Promise<GameSet[]> {
  const sets = await loadSetInfo(signal);
  return sets
    .filter((set) => (set.num_of_cards ?? 0) > 0)
    .map((set) => ({
      id: ygoSetId(set.set_code),
      game: 'yugioh' as const,
      code: set.set_code,
      name: set.set_name,
      releaseDate: slashDate(set.tcg_date),
      total: set.num_of_cards ?? 0,
      type: null,
      icon: set.set_image ?? `${SET_IMAGE_URL}/${encodeURIComponent(set.set_code)}.jpg`,
      iconIsSymbol: false,
    }))
    .sort((first, second) => second.releaseDate.localeCompare(first.releaseDate));
}

export async function getYgoSetCards(setId: string, signal?: AbortSignal): Promise<Card[]> {
  const code = setId.slice(SET_PREFIX.length);
  const { value } = await cachedFetch(code, SET_CARDS_CACHE, async () => {
    const sets = await loadSetInfo(signal);
    const set = sets.find((entry) => entry.set_code === code);
    if (!set) throw new ApiError('notFound');
    const [response, dates] = await Promise.all([
      fetchCards(`${BASE_URL}/cardinfo.php?${toQueryString({ cardset: set.set_name, misc: 'yes' })}`, signal),
      setDates(),
    ]);
    return response.data
      .flatMap((card) => toCards(card, 'en', dates))
      .filter((card) => card.set.name === set.set_name)
      .sort((first, second) => first.number.localeCompare(second.number, undefined, { numeric: true }));
  });
  return value;
}

async function loadSetInfo(signal?: AbortSignal): Promise<YgoSetInfo[]> {
  const { value } = await cachedFetch('all', SETS_CACHE, async () => {
    const response = await getJson<YgoSetInfo[]>(`${BASE_URL}/cardsets.php`, { signal, timeoutMs: 20_000 });
    if (!Array.isArray(response)) throw new ApiError('badResponse');
    return response;
  });
  return value;
}

async function setDates(): Promise<Map<string, string>> {
  try {
    const sets = await loadSetInfo();
    return new Map(sets.flatMap((set) => (set.tcg_date ? [[set.set_name, set.tcg_date] as [string, string]] : [])));
  } catch {
    return new Map();
  }
}

async function fetchCards(url: string, signal?: AbortSignal): Promise<YgoResponse> {
  try {
    const response = await getJson<YgoResponse>(url, { signal, timeoutMs: 15_000 });
    if (!Array.isArray(response.data)) throw new ApiError('badResponse');
    return response;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return { data: [], meta: { total_rows: 0 } };
    throw error;
  }
}

function idParams(ids: string, lang: YgoLanguage): Record<string, string> {
  return lang === 'en' ? { id: ids, misc: 'yes' } : { id: ids, misc: 'yes', language: lang };
}

function parseId(id: string): ParsedId | null {
  if (!isYgoId(id)) return null;
  const [body = '', lang = 'en'] = id.slice(PREFIX.length).split('@');
  const [passcode = '', setCode = null, rarityCode = null] = body.split('~');
  if (!/^\d+$/.test(passcode)) return null;
  return {
    passcode,
    setCode: setCode || null,
    rarityCode: rarityCode || null,
    lang: (YGO_LANGUAGES as readonly string[]).includes(lang) ? (lang as YgoLanguage) : 'en',
  };
}

function pickPrinting(cards: Card[], parsed: ParsedId): Card {
  const exact = cards.find((card) => card.id === buildId(parsed.passcode, parsed.setCode, parsed.rarityCode, parsed.lang));
  const sameSet = cards.find((card) => parsed.setCode !== null && card.number === parsed.setCode);
  const picked = exact ?? sameSet ?? cards[0];
  if (!picked) throw new ApiError('notFound');
  return parsed.setCode === null ? { ...picked, id: buildId(parsed.passcode, null, null, parsed.lang) } : picked;
}

function buildId(passcode: string, setCode: string | null, rarityCode: string | null, lang: YgoLanguage): string {
  const body = setCode ? `${passcode}~${setCode}~${rarityCode ?? ''}` : passcode;
  return `${PREFIX}${body}${lang === 'en' ? '' : `@${lang}`}`;
}

function toCards(card: YgoCard, lang: YgoLanguage, dates: Map<string, string>): Card[] {
  const printings = card.card_sets ?? [];
  if (printings.length === 0) return [toCard(card, null, lang, dates)];
  const seen = new Set<string>();
  return printings.flatMap((printing) => {
    const result = toCard(card, printing, lang, dates);
    if (seen.has(result.id)) return [];
    seen.add(result.id);
    return [result];
  });
}

function toCard(card: YgoCard, printing: YgoPrinting | null, lang: YgoLanguage, dates: Map<string, string>): Card {
  const image = card.card_images?.[0];
  const prices = card.card_prices?.[0];
  const rarityCode = printing?.set_rarity_code?.replace(/[()]/g, '') || null;
  const usd = (printing ? priceNumber(printing.set_price) : null) ?? (printing ? null : priceNumber(prices?.tcgplayer_price));
  const eur = priceNumber(prices?.cardmarket_price);
  const released = (printing ? dates.get(printing.set_name) : undefined) ?? card.misc_info?.[0]?.tcg_date ?? card.misc_info?.[0]?.ocg_date;
  const setCode = printing?.set_code.split('-')[0] ?? 'none';
  return {
    id: buildId(String(card.id), printing?.set_code ?? null, rarityCode, lang),
    game: 'yugioh',
    lang,
    name: card.name,
    number: printing?.set_code ?? String(card.id),
    rarity: printing?.set_rarity,
    set: {
      id: ygoSetId(setCode),
      name: printing?.set_name ?? 'Yu-Gi-Oh!',
      series: card.archetype ?? 'Yu-Gi-Oh!',
      total: 0,
      releaseDate: slashDate(released),
      ptcgoCode: setCode,
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
    card.scale !== undefined ? `Scale ${card.scale}` : null,
    card.atk !== undefined ? `ATK ${card.atk}` : null,
    card.def !== undefined ? `DEF ${card.def}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? [parts.join(' · ')] : [];
}
