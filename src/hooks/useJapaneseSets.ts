import { useCallback } from 'react';

import { loadGroups, type TcgcsvGroup } from '@/services/tcgcsv';

import { useResource } from './useResource';

export function useJapaneseSets() {
  const load = useCallback(async (): Promise<TcgcsvGroup[]> => {
    const groups = await loadGroups('jp');
    return groups
      .filter((group) => !group.isSupplemental)
      .sort((first, second) => (second.publishedOn ?? '').localeCompare(first.publishedOn ?? ''));
  }, []);
  return useResource('jp-groups', load);
}
