import { useCallback } from 'react';

import { locateTcgProduct } from '@/services/cardPrices';
import { extraProduct, isExtraCardId } from '@/services/extraCards';
import { fetchGradedPrices, type GradedPrice } from '@/services/graded';
import type { Card } from '@/types/card';

import { useResource } from './useResource';

export function useGradedPrices(card: Card | null): GradedPrice[] | null {
  const id = card?.id ?? null;
  const load = useCallback(
    async (signal: AbortSignal): Promise<GradedPrice[]> => {
      if (!card) return [];
      const located = isExtraCardId(card.id) ? await extraProduct(card.id) : await locateTcgProduct(card);
      return located ? fetchGradedPrices(located.productId, signal) : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );
  const { data, error } = useResource(id ? `graded:${id}` : 'graded:none', load);
  if (error) return [];
  return data;
}
