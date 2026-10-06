import type { TcgPlayerPrice } from '@/types/card';
import type { Market, SealedPrice, SealedProduct } from '@/types/sealed';

import { type CachePolicy, type Cached, cachedFetch } from './cache';
import { ApiError, getJson } from './http';

const CATEGORY_IDS: Record<Market, number> = { en: 3, jp: 85 };
const REQUEST_OPTIONS = {
  headers: { 'User-Agent': 'PullCheck/1.0 (iOS; Expo)' },
  maxAttempts: 6,
};
const HOUR = 60 * 60 * 1000;
const GROUPS_CACHE: CachePolicy = { bucket: 'tcgcsv-groups', ttlMs: 24 * HOUR, maxEntries: 2 };
const CATALOG_CACHE: CachePolicy = { bucket: 'tcgcsv-catalog', ttlMs: 6 * HOUR, maxEntries: 16 };
const PRODUCTS_CACHE: CachePolicy = { bucket: 'tcgcsv-products', ttlMs: 24 * HOUR, maxEntries: 30 };
const SET_FETCH_CONCURRENCY = 3;
export const MAIN_SET_NAME = /^[A-Z]{1,6}[\d.]*[a-z]?:\s/;
const NON_SET_NAME = /promo|energ|trainer kit/i;
const KEPT_FIELDS = new Set(['Number', 'Rarity', 'Card Type', 'HP', 'Stage', 'Weakness', 'Resistance', 'RetreatCost']);

export type TcgcsvGroup = {
  groupId: number;
  name: string;
  abbreviation: string | null;
  isSupplemental: boolean;
  publishedOn: string | null;
  market: Market;
};

export type CardListing = {
  productId: number;
  name: string;
  number: string;
  url: string;
  prices: Record<string, TcgPlayerPrice>;
};

export type GroupCatalog = {
  sealed: SealedProduct[];
  cards: CardListing[];
  singles: SealedProduct[];
};

type TcgcsvResponse<T> = {
  success: boolean;
  results: T[];
};

export type TcgcsvProduct = {
  productId: number;
  name: string;
  imageUrl: string;
  url: string;
  groupId: number;
  presaleInfo?: { releasedOn: string | null } | null;
  extendedData?: { name: string; value: string }[];
};

type TcgcsvPrice = {
  productId: number;
  subTypeName: string;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
};

type FetchOptions = {
  force?: boolean;
};

const knownProducts = new Map<number, SealedProduct>();

export function getKnownSealed(productId: number): SealedProduct | null {
  return knownProducts.get(productId) ?? null;
}

export async function loadGroups(market: Market = 'en', options: FetchOptions = {}): Promise<TcgcsvGroup[]> {
  const { value } = await cachedFetch(
    market,
    GROUPS_CACHE,
    async () => {
      const response = await getJson<TcgcsvResponse<Omit<TcgcsvGroup, 'market'>>>(`${baseUrl(market)}/groups`, REQUEST_OPTIONS);
      if (!Array.isArray(response.results)) throw new ApiError('badResponse');
      return response.results.map((group) => ({ ...group, market }));
    },
    options,
  );
  return value;
}

export async function loadGroupCatalog(group: TcgcsvGroup, options: FetchOptions = {}): Promise<GroupCatalog> {
  return (await loadGroupCatalogChecked(group, options)).value;
}

export async function loadGroupCatalogChecked(group: TcgcsvGroup, options: FetchOptions = {}): Promise<Cached<GroupCatalog>> {
  const result = await cachedFetch(
    `${group.market ?? 'en'}:${group.groupId}`,
    CATALOG_CACHE,
    () => fetchCatalog(group),
    options,
  );
  for (const product of [...result.value.sealed, ...(result.value.singles ?? [])]) {
    knownProducts.set(product.productId, product);
  }
  return { value: { ...result.value, singles: result.value.singles ?? [] }, stale: result.stale };
}

async function fetchCatalog(group: TcgcsvGroup): Promise<GroupCatalog> {
  const market = group.market ?? 'en';
  const [products, prices] = await Promise.all([
    getJson<TcgcsvResponse<TcgcsvProduct>>(`${baseUrl(market)}/${group.groupId}/products`, REQUEST_OPTIONS),
    getJson<TcgcsvResponse<TcgcsvPrice>>(`${baseUrl(market)}/${group.groupId}/prices`, REQUEST_OPTIONS),
  ]);
  if (!Array.isArray(products.results) || !Array.isArray(prices.results)) {
    throw new ApiError('badResponse');
  }

  const pricesById = new Map<number, TcgcsvPrice[]>();
  for (const price of prices.results) {
    const list = pricesById.get(price.productId) ?? [];
    list.push(price);
    pricesById.set(price.productId, list);
  }

  const catalog: GroupCatalog = { sealed: [], cards: [], singles: [] };
  for (const product of products.results) {
    const productPrices = pricesById.get(product.productId) ?? [];
    const number = extendedValue(product, 'Number');
    if (number) {
      if (market === 'en') catalog.cards.push(toCardListing(product, number, productPrices));
      else catalog.singles.push(toSingle(product, group, number, productPrices));
    } else if (!/^code card/i.test(product.name)) {
      catalog.sealed.push(toSealedProduct(product, group, productPrices[0] ?? null));
    }
  }
  return catalog;
}

export async function loadGroupProducts(group: TcgcsvGroup, options: FetchOptions = {}): Promise<Cached<TcgcsvProduct[]>> {
  return cachedFetch(
    `${group.market ?? 'en'}:${group.groupId}`,
    PRODUCTS_CACHE,
    async () => {
      const response = await getJson<TcgcsvResponse<TcgcsvProduct>>(
        `${baseUrl(group.market ?? 'en')}/${group.groupId}/products`,
        REQUEST_OPTIONS,
      );
      if (!Array.isArray(response.results)) throw new ApiError('badResponse');
      return response.results.map((product) => ({
        productId: product.productId,
        name: product.name,
        imageUrl: product.imageUrl,
        url: product.url,
        groupId: product.groupId,
        extendedData: product.extendedData?.filter((data) => KEPT_FIELDS.has(data.name)),
      }));
    },
    options,
  );
}

export function productField(product: TcgcsvProduct, name: string): string | null {
  return extendedValue(product, name);
}

export async function settleInBatches<T, R>(
  items: T[],
  load: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let index = 0; index < items.length; index += SET_FETCH_CONCURRENCY) {
    const batch = items.slice(index, index + SET_FETCH_CONCURRENCY);
    results.push(...(await Promise.allSettled(batch.map((item) => load(item)))));
  }
  return results;
}

export function isMainSet(group: TcgcsvGroup): boolean {
  return !group.isSupplemental && MAIN_SET_NAME.test(group.name) && !NON_SET_NAME.test(group.name);
}

export function displaySetName(group: TcgcsvGroup): string {
  return group.name.replace(MAIN_SET_NAME, '').trim() || group.name;
}

export function newestFirst(first: TcgcsvGroup, second: TcgcsvGroup): number {
  return second.groupId - first.groupId;
}

function baseUrl(market: Market): string {
  return `https://tcgcsv.com/tcgplayer/${CATEGORY_IDS[market]}`;
}

function extendedValue(product: TcgcsvProduct, name: string): string | null {
  return product.extendedData?.find((data) => data.name === name)?.value ?? null;
}

function toCardListing(product: TcgcsvProduct, number: string, prices: TcgcsvPrice[]): CardListing {
  const variants: Record<string, TcgPlayerPrice> = {};
  for (const price of prices) {
    variants[variantKey(price.subTypeName)] = {
      low: price.lowPrice,
      mid: price.midPrice,
      high: price.highPrice,
      market: price.marketPrice,
      directLow: price.directLowPrice,
    };
  }
  return { productId: product.productId, name: product.name, number, url: product.url, prices: variants };
}

function toSealedProduct(product: TcgcsvProduct, group: TcgcsvGroup, price: TcgcsvPrice | null): SealedProduct {
  const productReleasedOn = product.presaleInfo?.releasedOn ?? null;
  const setReleasedOn = isMainSet(group) ? group.publishedOn : null;
  return {
    productId: product.productId,
    groupId: group.groupId,
    name: product.name,
    setName: displaySetName(group),
    setCode: group.abbreviation || null,
    imageUrl: product.imageUrl,
    url: product.url,
    releasedOn: productReleasedOn ?? setReleasedOn,
    description: extendedValue(product, 'CardText'),
    upc: extendedValue(product, 'UPC'),
    prices: price ? toSealedPrice(price) : null,
    market: group.market ?? 'en',
    productReleasedOn,
    setReleasedOn,
    groupReleasedOn: group.publishedOn,
  };
}

function toSingle(product: TcgcsvProduct, group: TcgcsvGroup, number: string, prices: TcgcsvPrice[]): SealedProduct {
  const price = prices.find((entry) => entry.marketPrice !== null) ?? prices[0] ?? null;
  return {
    ...toSealedProduct(product, group, price),
    description: null,
    cardNumber: number,
    rarity: extendedValue(product, 'Rarity'),
  };
}

function toSealedPrice(price: TcgcsvPrice): SealedPrice {
  return {
    low: price.lowPrice,
    mid: price.midPrice,
    high: price.highPrice,
    market: price.marketPrice,
    directLow: price.directLowPrice,
  };
}

function variantKey(subTypeName: string): string {
  const words = subTypeName.trim().split(/\s+/);
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}
