import { useCallback } from 'react';

import { getGameSetCards } from '@/services/otherGames';
import { rememberCards } from '@/services/pokemonTcg';

import { useResource } from './useResource';

export function useGameSetCards(setId: string) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const cards = await getGameSetCards(setId, signal);
      rememberCards(cards);
      return cards;
    },
    [setId],
  );
  const { data, error, retry } = useResource(`game-set:${setId}`, load);
  return { cards: data, error, retry };
}
