import { useCallback } from 'react';

import { locateTcgProduct } from '@/services/cardPrices';
import { extraProduct, isExtraCardId } from '@/services/extraCards';
import { fetchGradedPrices, type GradedResult } from '@/services/graded';
import { dexProductId, findDexCardFor } from '@/services/tcgdex';
import type { Card } from '@/types/card';

import { useResource } from './useResource';

export function useGradedPrices(card: Card | null): GradedResult | null {
  const id = card?.id ?? null;
  const load = useCallback(
    async (signal: AbortSignal): Promise<GradedResult> => {
      if (!card) return { prices: [], limitedUntil: null };
      const dex = isExtraCardId(card.id) ? null : await findDexCardFor(card, signal);
      const productId =
        (dex ? dexProductId(dex) : null) ??
        (isExtraCardId(card.id) ? await extraProduct(card.id) : await locateTcgProduct(card))?.productId ??
        null;
      return productId ? fetchGradedPrices(productId, signal) : { prices: [], limitedUntil: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );
  const { data, error } = useResource(id ? `graded:${id}` : 'graded:none', load);
  if (error) return { prices: [], limitedUntil: null };
  return data;
}
