import { useEffect, useState } from 'react';

import { getGroupArt } from '@/services/groupArt';
import type { Market } from '@/types/sealed';

export function useGroupArt(groupId: number | null, market: Market): string | null {
  const [art, setArt] = useState<{ key: string; url: string | null } | null>(null);
  const key = groupId === null ? null : `${market}:${groupId}`;

  useEffect(() => {
    if (groupId === null || key === null) return;
    let alive = true;
    getGroupArt(groupId, market)
      .then((url) => {
        if (alive) setArt({ key, url });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [groupId, market, key]);

  return art && art.key === key ? art.url : null;
}

export function extraGroupId(setId: string): number | null {
  const match = /^tcg-set-(\d+)$/.exec(setId);
  return match ? Number(match[1]) : null;
}
