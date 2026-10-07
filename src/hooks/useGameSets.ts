import { useCallback } from 'react';

import { getGameSets } from '@/services/otherGames';
import type { OtherGame } from '@/utils/game';

import { useResource } from './useResource';

export function useGameSets(game: OtherGame | null) {
  const load = useCallback((signal: AbortSignal) => (game ? getGameSets(game, signal) : Promise.resolve([])), [game]);
  const { data, error, retry } = useResource(`game-sets:${game ?? 'none'}`, load);
  return { sets: data, error, retry };
}
