import { useCallback } from 'react';

import { getSetSymbolXml } from '@/services/setSymbols';

import { useResource } from './useResource';

export function useSetSymbol(url: string | null) {
  const load = useCallback(
    (signal: AbortSignal): Promise<string | null> => (url ? getSetSymbolXml(url, signal) : Promise.resolve(null)),
    [url],
  );
  const { data, error } = useResource(`symbol:${url ?? ''}`, load);
  return { xml: data, failed: error !== null };
}
