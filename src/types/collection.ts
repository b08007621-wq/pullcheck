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

export type Binder = 'personal' | 'trade' | 'sale';

type CollectedBase = {
  key: string;
  binder?: Binder;
  addedAt: string;
  lastAddedAt: string;
  quantity: number;
  priceAtAdd: MarketPrice | null;
  paid?: PaidPrice | null;
  history?: PricePoint[];
};

export type GradingCompany = 'PSA' | 'BGS' | 'CGC' | 'TAG';

export type Grading = {
  company: GradingCompany;
  grade: string;
  value: number | null;
};

export type CollectedCard = CollectedBase & {
  kind: 'card';
  card: Card;
  variant?: string | null;
  condition?: Condition;
  grading?: Grading | null;
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

export type BinderFilter = 'all' | Binder;

export type CollectionView = 'list' | 'grid' | 'cover';

export type CollectionSort = 'value' | 'recent' | 'gain' | 'drop' | 'name' | 'set';

export type ChangeBasis = 'auto' | 'added' | 'paid' | 'day' | 'week' | 'month';

export type QuickFilter = 'dupes' | 'graded' | 'new' | 'gainers' | 'losers' | 'unpriced';

export type CollectionSection = 'pulled' | 'summary' | 'chart' | 'recent' | 'stats' | 'shortcuts';

export type CollectionLayout = {
  order: CollectionSection[];
  hidden: CollectionSection[];
  gridColumns: 2 | 3 | 4;
  gridDetails: boolean;
  changeBasis: ChangeBasis;
};
