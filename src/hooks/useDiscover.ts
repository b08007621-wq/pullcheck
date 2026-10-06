import { useCallback } from 'react';

import { type Discover, type DiscoverPick, loadDiscover, loadRisingExtra } from '@/services/discover';

import { useResource } from './useResource';

export function useDiscover(enabled: boolean) {
  const load = useCallback(
    (signal: AbortSignal): Promise<Discover | null> => (enabled ? loadDiscover(signal) : Promise.resolve(null)),
    [enabled],
  );
  const { data, error, retry } = useResource(enabled ? 'discover' : 'discover-off', load);
  return { discover: data, error, retry };
}

export function useRisingExtra(enabled: boolean) {
  const load = useCallback(
    (signal: AbortSignal): Promise<DiscoverPick[]> => (enabled ? loadRisingExtra(signal) : Promise.resolve([])),
    [enabled],
  );
  const { data } = useResource(enabled ? 'rising-extra' : 'rising-extra-off', load);
  return data;
}
