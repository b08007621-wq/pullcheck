import type { Card } from './card';

export type WishItem = {
  id: string;
  card: Card;
  variant: string | null;
  target: number | null;
  addedAt: string;
  priceAtAdd: number | null;
};

export type WishlistMeta = {
  lastRefreshAt: string | null;
};
