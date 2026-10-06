import type { Card, CardmarketPrices, TcgPlayerPrice } from '@/types/card';

export type Currency = 'USD' | 'EUR';

export type PriceSource = 'tcgplayer' | 'cardmarket';

export type PriceBasis = 'market' | 'mid' | 'low' | 'trend' | 'average';

export type MarketPrice = {
  amount: number;
  currency: Currency;
  source: PriceSource;
  basis?: PriceBasis;
};

export type PriceRow = {
  label: string;
  amount: number;
};

export type VariantPrices = {
  variant: string;
  label: string;
  rows: PriceRow[];
};

const BASIS_LABEL: Record<PriceBasis, string> = {
  market: 'Market',
  mid: 'Mid',
  low: 'Lowest listing',
  trend: 'Trend',
  average: 'Avg sold',
};

export function priceLabel(price: MarketPrice): string {
  return BASIS_LABEL[price.basis ?? (price.source === 'cardmarket' ? 'trend' : 'market')];
}

export function pickPrice(
  candidates: [PriceBasis, number | null | undefined][],
  currency: Currency,
  source: PriceSource,
): MarketPrice | null {
  for (const [basis, value] of candidates) {
    const amount = positive(value);
    if (amount !== null) return { amount, currency, source, basis };
  }
  return null;
}

const VARIANT_PRIORITY = [
  'holofoil',
  'normal',
  'reverseHolofoil',
  '1stEditionHolofoil',
  '1stEditionNormal',
  'unlimitedHolofoil',
  'unlimited',
  '1stEdition',
];

const VARIANT_LABEL: Record<string, string> = {
  holofoil: 'Holofoil',
  normal: 'Normal',
  reverseHolofoil: 'Reverse Holo',
  '1stEditionHolofoil': '1st Edition Holo',
  '1stEditionNormal': '1st Edition',
  unlimitedHolofoil: 'Unlimited Holo',
  unlimited: 'Unlimited',
  '1stEdition': '1st Edition',
};

const VARIANT_SHORT_LABEL: Record<string, string> = {
  holofoil: 'Holo',
  normal: 'Normal',
  reverseHolofoil: 'Reverse',
  '1stEditionHolofoil': '1st Ed. Holo',
  '1stEditionNormal': '1st Ed.',
  unlimitedHolofoil: 'Unl. Holo',
  unlimited: 'Unlimited',
  '1stEdition': '1st Ed.',
};

const TCG_BASES = ['market', 'mid', 'low'] as const;

const formatters = new Map<Currency, Intl.NumberFormat>();

export function getMarketPrice(card: Card): MarketPrice | null {
  return getTcgPlayerPrice(card) ?? getCardmarketPrice(card);
}

export function getVariantPrice(card: Card, variant: string | null): MarketPrice | null {
  const price = variant ? card.tcgplayer?.prices?.[variant] : undefined;
  const picked = price
    ? pickPrice(
        TCG_BASES.map((basis): [PriceBasis, number | null | undefined] => [basis, price[basis]]),
        'USD',
        'tcgplayer',
      )
    : null;
  return picked ?? getMarketPrice(card);
}

export function defaultVariant(card: Card): string | null {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;
  const variants = sortVariants(Object.entries(prices));
  for (const basis of TCG_BASES) {
    for (const [key, variant] of variants) {
      if (positive(variant[basis]) !== null) return key;
    }
  }
  return null;
}

export function getVariantOptions(card: Card): string[] {
  const prices = card.tcgplayer?.prices;
  if (!prices) return [];
  return sortVariants(Object.entries(prices))
    .filter(([, price]) => TCG_BASES.some((basis) => positive(price[basis]) !== null))
    .map(([key]) => key);
}

export function variantLabel(variant: string): string {
  return VARIANT_LABEL[variant] ?? humanizeVariant(variant);
}

export function variantShortLabel(variant: string): string {
  return VARIANT_SHORT_LABEL[variant] ?? humanizeVariant(variant);
}

export function formatPrice(price: MarketPrice): string {
  return formatMoney(price.amount, price.currency);
}

export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

export function percentChange(from: number, to: number): number | null {
  return from > 0 ? ((to - from) / from) * 100 : null;
}

export function formatPercent(value: number): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export function getTcgPlayerVariants(card: Card): VariantPrices[] {
  const prices = card.tcgplayer?.prices;
  if (!prices) return [];

  return sortVariants(Object.entries(prices))
    .map(([variant, price]) => ({
      variant,
      label: variantLabel(variant),
      rows: tcgPlayerRows(price),
    }))
    .filter((variant) => variant.rows.length > 0);
}

export function getCardmarketRows(prices: CardmarketPrices | undefined): PriceRow[] {
  if (!prices) return [];
  return compactRows([
    ['Trend', prices.trendPrice],
    ['Average sold', prices.averageSellPrice],
    ['Lowest listing', prices.lowPrice],
    ['1-day average', prices.avg1],
    ['7-day average', prices.avg7],
    ['30-day average', prices.avg30],
  ]);
}

export function positive(value: number | null | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}

function getTcgPlayerPrice(card: Card): MarketPrice | null {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;

  const variants = sortVariants(Object.entries(prices));
  for (const basis of TCG_BASES) {
    for (const [, variant] of variants) {
      const price = pickPrice([[basis, variant[basis]]], 'USD', 'tcgplayer');
      if (price) return price;
    }
  }
  return null;
}

function getCardmarketPrice(card: Card): MarketPrice | null {
  const prices = card.cardmarket?.prices;
  if (!prices) return null;

  return pickPrice(
    [
      ['trend', prices.trendPrice],
      ['average', prices.averageSellPrice],
      ['low', prices.lowPrice],
    ],
    'EUR',
    'cardmarket',
  );
}

function tcgPlayerRows(price: TcgPlayerPrice): PriceRow[] {
  return compactRows([
    ['Market', price.market],
    ['Low', price.low],
    ['Mid', price.mid],
    ['High', price.high],
    ['Direct low', price.directLow],
  ]);
}

function compactRows(entries: [string, number | null | undefined][]): PriceRow[] {
  const rows: PriceRow[] = [];
  for (const [label, value] of entries) {
    const amount = positive(value);
    if (amount !== null) rows.push({ label, amount });
  }
  return rows;
}

function sortVariants<T>(entries: [string, T][]): [string, T][] {
  return [...entries].sort(([first], [second]) => variantRank(first) - variantRank(second));
}

function variantRank(variant: string): number {
  const index = VARIANT_PRIORITY.indexOf(variant);
  return index === -1 ? VARIANT_PRIORITY.length : index;
}

function humanizeVariant(variant: string): string {
  const spaced = variant.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
