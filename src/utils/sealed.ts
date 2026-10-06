import type { SealedPrice, SealedProduct } from '@/types/sealed';

import { type MarketPrice, pickPrice, positive, type PriceRow } from './price';

export type ProductDescription = {
  intro: string[];
  contents: string[];
};

export function getSealedMarketPrice(product: SealedProduct): MarketPrice | null {
  const prices = product.prices;
  if (!prices) return null;
  return pickPrice(
    [
      ['market', prices.market],
      ['mid', prices.mid],
      ['low', prices.low ?? prices.directLow],
    ],
    'USD',
    'tcgplayer',
  );
}

export function getSealedPriceRows(prices: SealedPrice | null): PriceRow[] {
  if (!prices) return [];
  const rows: PriceRow[] = [];
  const entries: [string, number | null][] = [
    ['Market', prices.market],
    ['Low', prices.low],
    ['Mid', prices.mid],
    ['High', prices.high],
    ['Direct low', prices.directLow],
  ];
  for (const [label, value] of entries) {
    const amount = positive(value);
    if (amount !== null) rows.push({ label, amount });
  }
  return rows;
}

export function largeProductImage(imageUrl: string): string {
  return imageUrl.replace(/_200w\.jpg$/, '_in_1000x1000.jpg');
}

export function parseProductDescription(html: string | null): ProductDescription {
  if (!html) return { intro: [], contents: [] };

  const lines = html
    .split(/<br\s*\/?>/i)
    .map((line) => decodeEntities(line.replace(/<[^>]+>/g, '')).trim())
    .filter((line) => line.length > 0);

  const intro: string[] = [];
  const contents: string[] = [];
  for (const line of lines) {
    if (/^[•\-*]/.test(line)) {
      contents.push(line.replace(/^[•\-*]\s*/, ''));
    } else if (!/includes:?$/i.test(line)) {
      intro.push(line);
    }
  }
  return { intro, contents };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
