import type { WishItem } from '@/types/wishlist';

import { cardVersionPrice } from './cardVersion';

export type WishStatus = {
  price: number | null;
  hit: boolean;
  gap: number | null;
};

export function wishStatus(item: WishItem): WishStatus {
  const price = cardVersionPrice(item.card, { variant: item.variant, condition: 'NM' });
  const usd = price?.currency === 'USD' ? price.amount : null;
  if (usd === null || item.target === null) return { price: usd, hit: false, gap: null };
  return { price: usd, hit: usd <= item.target, gap: Math.round((usd - item.target) * 100) / 100 };
}

export function countHits(items: WishItem[]): number {
  return items.filter((item) => wishStatus(item).hit).length;
}

export function sortWishes(items: WishItem[]): WishItem[] {
  return [...items].sort((first, second) => {
    const a = wishStatus(first);
    const b = wishStatus(second);
    if (a.hit !== b.hit) return a.hit ? -1 : 1;
    return (b.price ?? -1) - (a.price ?? -1);
  });
}
