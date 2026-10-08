import type { Game } from './card';

export type Market = 'en' | 'jp';

export type SealedPrice = {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  directLow: number | null;
};

export type SealedProduct = {
  productId: number;
  groupId: number;
  name: string;
  setName: string;
  setCode: string | null;
  imageUrl: string;
  url: string;
  releasedOn: string | null;
  description: string | null;
  upc: string | null;
  prices: SealedPrice | null;
  market?: Market;
  game?: Game;
  productReleasedOn?: string | null;
  setReleasedOn?: string | null;
  groupReleasedOn?: string | null;
  cardNumber?: string | null;
  rarity?: string | null;
};
