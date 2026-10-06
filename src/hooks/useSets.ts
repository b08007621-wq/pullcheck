import { useCallback, useEffect, useMemo, useState } from 'react';

import { extraSets, loadExtraIndex, subscribeExtraIndex } from '@/services/extraCards';
import { loadSets } from '@/services/sets';

import { useResource } from './useResource';

export function useSets() {
  const load = useCallback((signal: AbortSignal) => loadSets(signal), []);
  const { data, error, retry } = useResource('sets', load);
  const [extraTick, setExtraTick] = useState(0);

  useEffect(() => subscribeExtraIndex(() => setExtraTick((value) => value + 1)), []);

  useEffect(() => {
    loadExtraIndex().catch(() => {});
  }, []);

  const sets = useMemo(() => (data && extraTick >= 0 ? [...data, ...extraSets()] : null), [data, extraTick]);
  return { sets, error, retry };
}
