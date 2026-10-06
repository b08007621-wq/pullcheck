import { useCallback, useEffect, useState } from 'react';

import { readJson, STORAGE_KEYS, writeJson } from '@/services/storage';

const MAX_RECENT = 8;

export function useRecentSearches(kind: 'cards' | 'sealed') {
  const storageKey = `${STORAGE_KEYS.recentSearches}.${kind}`;
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    readJson<string[]>(storageKey).then((stored) => {
      if (active && Array.isArray(stored)) setRecent(stored.filter((item) => typeof item === 'string'));
    });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const remember = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setRecent((current) => {
        if (current[0]?.toLowerCase() === trimmed.toLowerCase()) return current;
        const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
        writeJson(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    setRecent([]);
    writeJson(storageKey, []);
  }, [storageKey]);

  return { recent, remember, clear };
}
