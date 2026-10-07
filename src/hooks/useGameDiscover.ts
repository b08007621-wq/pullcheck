import { useCallback } from 'react';

import { loadGameDiscover } from '@/services/gameDiscover';
import type { OtherGame } from '@/utils/game';

import { useResource } from './useResource';

export function useGameDiscover(game: OtherGame) {
  const load = useCallback((signal: AbortSignal) => loadGameDiscover(game, signal), [game]);
  const { data, error, retry } = useResource(`game-discover:${game}`, load);
  return { discover: data, error, retry };
}
