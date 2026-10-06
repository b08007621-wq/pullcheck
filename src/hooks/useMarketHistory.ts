import { useEffect, useState } from 'react';

import { recordMarketPrice } from '@/services/marketHistory';
import type { PricePoint } from '@/types/collection';

export function useMarketHistory(id: string | null, usd: number | null): PricePoint[] {
  const [state, setState] = useState<{ id: string; points: PricePoint[] } | null>(null);

  useEffect(() => {
    if (!id || usd === null || usd <= 0) return;
    let alive = true;
    recordMarketPrice(id, usd).then((points) => {
      if (alive) setState({ id, points });
    });
    return () => {
      alive = false;
    };
  }, [id, usd]);

  return state && state.id === id ? state.points : [];
}
