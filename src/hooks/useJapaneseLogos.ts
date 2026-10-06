import { useCallback } from 'react';

import { loadJapaneseLogos } from '@/services/tcgdex';

import { useResource } from './useResource';

export function useJapaneseLogos(): Record<string, string> {
  const load = useCallback(() => loadJapaneseLogos(), []);
  return useResource('tcgdex-ja-logos', load).data ?? {};
}
