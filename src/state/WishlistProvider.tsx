import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchCardsByIds } from '@/services/collectionRefresh';
import { readJson, STORAGE_KEYS, writeJson } from '@/services/storage';
import type { Card } from '@/types/card';
import type { WishItem, WishlistMeta } from '@/types/wishlist';
import { cardVersionPrice } from '@/utils/cardVersion';
import { countHits } from '@/utils/wishlist';

import { WishlistContext } from './wishlistContext';

type Props = {
  children: ReactNode;
};

const AUTO_REFRESH_MS = 30 * 60 * 1000;
const EMPTY_META: WishlistMeta = { lastRefreshAt: null };

export function WishlistProvider({ children }: Props) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [meta, setMeta] = useState<WishlistMeta>(EMPTY_META);
  const [isLoaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const itemsRef = useRef(items);
  const metaRef = useRef(meta);
  const refreshingRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
    metaRef.current = meta;
  });

  useEffect(() => {
    Promise.all([readJson<WishItem[]>(STORAGE_KEYS.wishlist), readJson<WishlistMeta>(STORAGE_KEYS.wishlistMeta)]).then(
      ([savedItems, savedMeta]) => {
        setItems(Array.isArray(savedItems) ? savedItems.filter(isWishItem) : []);
        setMeta(savedMeta && typeof savedMeta === 'object' ? { lastRefreshAt: savedMeta.lastRefreshAt ?? null } : EMPTY_META);
        setLoaded(true);
      },
    );
  }, []);

  useEffect(() => {
    if (isLoaded) writeJson(STORAGE_KEYS.wishlist, items);
  }, [isLoaded, items]);

  useEffect(() => {
    if (isLoaded) writeJson(STORAGE_KEYS.wishlistMeta, meta);
  }, [isLoaded, meta]);

  const refresh = useCallback(async (force: boolean) => {
    const current = itemsRef.current;
    const last = metaRef.current.lastRefreshAt;
    if (refreshingRef.current || current.length === 0) return;
    if (!force && last && Date.now() - Date.parse(last) < AUTO_REFRESH_MS) return;

    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const { cards } = await fetchCardsByIds(current.map((item) => item.id));
      if (cards.length > 0) {
        const byId = new Map(cards.map((card) => [card.id, card]));
        setItems((list) => list.map((item) => {
          const card = byId.get(item.id);
          return card ? { ...item, card } : item;
        }));
      }
      setMeta({ lastRefreshAt: new Date().toISOString() });
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) refresh(false);
  }, [isLoaded, refresh]);

  const add = useCallback((card: Card, variant: string | null) => {
    const price = cardVersionPrice(card, { variant, condition: 'NM' });
    setItems((list) =>
      list.some((item) => item.id === card.id)
        ? list
        : [
            {
              id: card.id,
              card,
              variant,
              target: null,
              addedAt: new Date().toISOString(),
              priceAtAdd: price?.currency === 'USD' ? price.amount : null,
            },
            ...list,
          ],
    );
  }, []);

  const remove = useCallback((cardId: string) => {
    setItems((list) => list.filter((item) => item.id !== cardId));
  }, []);

  const setTarget = useCallback((cardId: string, target: number | null) => {
    setItems((list) => list.map((item) => (item.id === cardId ? { ...item, target } : item)));
  }, []);

  const setVariant = useCallback((cardId: string, variant: string | null) => {
    setItems((list) => list.map((item) => (item.id === cardId ? { ...item, variant } : item)));
  }, []);

  const fulfill = useCallback((cardIds: string[]) => {
    if (cardIds.length === 0) return;
    const done = new Set(cardIds);
    setItems((list) => (list.some((item) => done.has(item.id)) ? list.filter((item) => !done.has(item.id)) : list));
  }, []);

  const wishedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const isWished = useCallback((cardId: string) => wishedIds.has(cardId), [wishedIds]);
  const hits = useMemo(() => countHits(items), [items]);

  const restore = useCallback((incoming: unknown[], replace: boolean) => {
    const valid = incoming.filter(isWishItem);
    setItems((list) =>
      replace ? valid : [...list, ...valid.filter((item) => !list.some((existing) => existing.id === item.id))],
    );
  }, []);

  const value = useMemo(
    () => ({ items, meta, isLoaded, refreshing, hits, isWished, add, remove, setTarget, setVariant, fulfill, refresh, restore }),
    [items, meta, isLoaded, refreshing, hits, isWished, add, remove, setTarget, setVariant, fulfill, refresh, restore],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

function isWishItem(value: unknown): value is WishItem {
  const item = value as WishItem | null;
  return Boolean(item && typeof item.id === 'string' && item.card && typeof item.card.id === 'string');
}
