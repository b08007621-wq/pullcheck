import { createContext } from 'react';

import type { Card } from '@/types/card';
import type { WishItem, WishlistMeta } from '@/types/wishlist';

export type WishlistContextValue = {
  items: WishItem[];
  meta: WishlistMeta;
  isLoaded: boolean;
  refreshing: boolean;
  hits: number;
  isWished: (cardId: string) => boolean;
  add: (card: Card, variant: string | null) => void;
  remove: (cardId: string) => void;
  setTarget: (cardId: string, target: number | null) => void;
  setVariant: (cardId: string, variant: string | null) => void;
  fulfill: (cardIds: string[]) => void;
  refresh: (force: boolean) => Promise<void>;
  restore: (items: unknown[], replace: boolean) => void;
};

export const WishlistContext = createContext<WishlistContextValue>({
  items: [],
  meta: { lastRefreshAt: null },
  isLoaded: false,
  refreshing: false,
  hits: 0,
  isWished: () => false,
  add: () => {},
  remove: () => {},
  setTarget: () => {},
  setVariant: () => {},
  fulfill: () => {},
  refresh: async () => {},
  restore: () => {},
});
