import type { Condition } from '@/utils/condition';
import type { Currency, MarketPrice } from '@/utils/price';

import type { Card } from './card';
import type { SealedProduct } from './sealed';

export type PricePoint = {
  date: string;
  amount: number;
  currency?: Currency;
};

export type ValuePoint = {
  date: string;
  total: number;
};

export type PaidPrice = {
  amount: number;
  currency: Currency;
};

type CollectedBase = {
  key: string;
  addedAt: string;
  lastAddedAt: string;
  quantity: number;
  priceAtAdd: MarketPrice | null;
  paid?: PaidPrice | null;
  history?: PricePoint[];
};

export type CollectedCard = CollectedBase & {
  kind: 'card';
  card: Card;
  variant?: string | null;
  condition?: Condition;
};

export type CollectedSealed = CollectedBase & {
  kind: 'sealed';
  product: SealedProduct;
};

export type CollectionItem = CollectedCard | CollectedSealed;

export type CollectionMeta = {
  lastRefreshAt: string | null;
  pricesAsOf?: string | null;
  valueHistory: ValuePoint[];
};

export type CollectionFilter = 'all' | 'card' | 'sealed';

export type CollectionSort = 'value' | 'recent';
