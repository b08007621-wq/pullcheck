import { useCallback } from 'react';

import { findEnglishVersions, findJapaneseVersions } from '@/services/crossLanguage';
import type { Card } from '@/types/card';
import type { SealedProduct } from '@/types/sealed';

import { useResource } from './useResource';

export function useJapaneseVersions(card: Card | null) {
  const load = useCallback(
    (signal: AbortSignal) => (card ? findJapaneseVersions(card, signal) : Promise.resolve([])),
    [card],
  );
  return useResource(card ? `jp-of:${card.id}` : 'jp-of:none', load).data;
}

export function useEnglishVersions(product: SealedProduct | null) {
  const load = useCallback(
    (signal: AbortSignal) => (product ? findEnglishVersions(product, signal) : Promise.resolve([])),
    [product],
  );
  return useResource(product ? `en-of:${product.productId}` : 'en-of:none', load).data;
}
