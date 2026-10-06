import { useCallback, useEffect, useMemo } from 'react';

import { enrichCardPrices } from '@/services/cardPrices';
import { getCard, getKnownCard } from '@/services/pokemonTcg';
import type { CollectedCard } from '@/types/collection';

import { useCollection } from './useCollection';
import { useResource } from './useResource';

export function useCardDetail(id: string) {
  const { items, refreshCard } = useCollection();
  const owned = useMemo(
    () => items.filter((item): item is CollectedCard => item.kind === 'card' && item.card.id === id),
    [items, id],
  );
  const isOwned = owned.length > 0;

  const load = useCallback(
    async (signal: AbortSignal) => {
      const card = await getCard(id, signal);
      const [enriched] = await enrichCardPrices([card]);
      return enriched ?? card;
    },
    [id],
  );
  const { data, error, retry } = useResource(id, load);

  useEffect(() => {
    if (data && isOwned) refreshCard(data);
  }, [data, isOwned, refreshCard]);

  return {
    card: data ?? owned[0]?.card ?? getKnownCard(id),
    owned,
    isFresh: data !== null,
    error,
    retry,
  };
}
