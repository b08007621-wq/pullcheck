import { useCallback } from 'react';

import { findSet, loadSets } from '@/services/sets';

import { useResource } from './useResource';

export function useSetLogo(setName: string | null) {
  const load = useCallback(
    async (signal: AbortSignal) => (setName ? (findSet(await loadSets(signal), setName)?.logo ?? null) : null),
    [setName],
  );
  return useResource(`logo:${setName ?? ''}`, load).data;
}
