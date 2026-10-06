import { useCallback, useEffect } from 'react';

import { getSealedProduct } from '@/services/sealedProducts';
import { getKnownSealed } from '@/services/tcgcsv';
import { sealedKey } from '@/state/collectionContext';
import type { CollectedSealed } from '@/types/collection';
import type { Market } from '@/types/sealed';

import { useCollection } from './useCollection';
import { useResource } from './useResource';

export function useSealedDetail(productId: number, groupId: number, market: Market = 'en') {
  const { items, refreshSealed } = useCollection();
  const collected = items.find((item) => item.key === sealedKey(productId));
  const owned: CollectedSealed | null = collected?.kind === 'sealed' ? collected : null;
  const isOwned = owned !== null;

  const load = useCallback(
    (signal: AbortSignal) => getSealedProduct(groupId, productId, signal, market),
    [groupId, productId, market],
  );
  const { data, error, retry } = useResource(`${market}:${groupId}:${productId}`, load);

  useEffect(() => {
    if (data && isOwned) refreshSealed(data);
  }, [data, isOwned, refreshSealed]);

  return {
    product: data ?? owned?.product ?? getKnownSealed(productId),
    owned,
    isFresh: data !== null,
    error,
    retry,
  };
}
