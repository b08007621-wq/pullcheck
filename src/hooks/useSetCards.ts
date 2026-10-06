import { useCallback } from 'react';

import { enrichCardPrices } from '@/services/cardPrices';
import { getSetCards } from '@/services/pokemonTcg';

import { useResource } from './useResource';

export function useSetCards(setId: string) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const { value, stale } = await getSetCards(setId, signal);
      return { cards: await enrichCardPrices(value), stale };
    },
    [setId],
  );
  const { data, error, retry } = useResource(`set:${setId}`, load);
  return { cards: data?.cards ?? null, stale: data?.stale ?? false, error, retry };
}
