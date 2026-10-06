import { useCallback } from 'react';

import { type Discover, loadDiscover } from '@/services/discover';

import { useResource } from './useResource';

export function useDiscover(enabled: boolean) {
  const load = useCallback(
    (signal: AbortSignal): Promise<Discover | null> => (enabled ? loadDiscover(signal) : Promise.resolve(null)),
    [enabled],
  );
  const { data, error, retry } = useResource(enabled ? 'discover' : 'discover-off', load);
  return { discover: data, error, retry };
}
