import { useCallback, useEffect, useRef } from 'react';

import { locateTcgProduct } from '@/services/cardPrices';
import { extraProduct, isExtraCardId } from '@/services/extraCards';
import { loadProductHistory } from '@/services/priceHistory';
import type { Card } from '@/types/card';
import type { PricePoint } from '@/types/collection';
import type { Market } from '@/types/sealed';

import { useResource } from './useResource';

export type HistorySource =
  | { kind: 'card'; card: Card; variant: string | null }
  | { kind: 'product'; market: Market; groupId: number; productId: number };

export function useLongHistory(source: HistorySource | null): PricePoint[] {
  const key = !source
    ? 'history:none'
    : source.kind === 'card'
      ? `history:card:${source.card.id}:${source.variant ?? '-'}`
      : `history:${source.market}:${source.productId}`;

  const sourceRef = useRef(source);
  useEffect(() => {
    sourceRef.current = source;
  });

  const load = useCallback(async (): Promise<PricePoint[]> => {
    const source = sourceRef.current;
    if (!source || key === 'history:none') return [];
    if (source.kind === 'product') {
      return loadProductHistory(source.market, source.groupId, source.productId);
    }
    const located = isExtraCardId(source.card.id)
      ? await extraProduct(source.card.id)
      : await locateTcgProduct(source.card);
    return located ? loadProductHistory('en', located.groupId, located.productId, source.variant) : [];
  }, [key]);

  return useResource(key, load).data ?? [];
}
