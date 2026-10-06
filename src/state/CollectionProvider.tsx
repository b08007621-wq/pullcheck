import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { fetchCollectionPrices } from '@/services/collectionRefresh';
import { readJson, STORAGE_KEYS, writeJson } from '@/services/storage';
import type { Card } from '@/types/card';
import type { Binder, CollectionItem, CollectionMeta, PaidPrice } from '@/types/collection';
import type { SealedProduct } from '@/types/sealed';
import type { CardVersion } from '@/utils/cardVersion';

import { CollectionContext } from './collectionContext';
import { type CardEntry, collectionReducer, EMPTY_META, INITIAL_COLLECTION } from './collectionReducer';

type Props = {
  children: ReactNode;
};

const AUTO_REFRESH_MS = 30 * 60 * 1000;

export function CollectionProvider({ children }: Props) {
  const [state, dispatch] = useReducer(collectionReducer, INITIAL_COLLECTION);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const stateRef = useRef(state);
  const refreshingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    Promise.all([
      readJson<CollectionItem[]>(STORAGE_KEYS.collection),
      readJson<CollectionMeta>(STORAGE_KEYS.collectionMeta),
    ]).then(([items, meta]) => {
      dispatch({ type: 'hydrate', items: Array.isArray(items) ? items : [], meta: sanitizeMeta(meta) });
    });
  }, []);

  useEffect(() => {
    if (state.isLoaded) writeJson(STORAGE_KEYS.collection, state.items);
  }, [state.isLoaded, state.items]);

  useEffect(() => {
    if (state.isLoaded) writeJson(STORAGE_KEYS.collectionMeta, state.meta);
  }, [state.isLoaded, state.meta]);

  const addCard = useCallback(
    (card: Card, version: CardVersion) => dispatch({ type: 'addCard', card, version, at: now() }),
    [],
  );
  const addCards = useCallback(
    (entries: CardEntry[]) => {
      if (entries.length > 0) dispatch({ type: 'addCards', entries, at: now() });
    },
    [],
  );
  const addSealed = useCallback(
    (product: SealedProduct) => dispatch({ type: 'addSealed', product, at: now() }),
    [],
  );
  const setQuantity = useCallback(
    (key: string, quantity: number) => dispatch({ type: 'setQuantity', key, quantity, at: now() }),
    [],
  );
  const remove = useCallback((key: string) => dispatch({ type: 'remove', key, at: now() }), []);
  const refreshCard = useCallback((card: Card) => dispatch({ type: 'refreshCard', card, at: now() }), []);
  const refreshSealed = useCallback(
    (product: SealedProduct) => dispatch({ type: 'refreshSealed', product, at: now() }),
    [],
  );
  const setPaid = useCallback((key: string, paid: PaidPrice | null) => dispatch({ type: 'setPaid', key, paid }), []);
  const setBinder = useCallback((key: string, binder: Binder) => dispatch({ type: 'setBinder', key, binder }), []);

  const refreshPrices = useCallback(async (force: boolean) => {
    const { items, meta, isLoaded } = stateRef.current;
    if (!isLoaded || refreshingRef.current || items.length === 0) return;
    if (!force && meta.lastRefreshAt && Date.now() - Date.parse(meta.lastRefreshAt) < AUTO_REFRESH_MS) return;

    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const outcome = await fetchCollectionPrices(items);
      const updated = outcome.cards.length + outcome.products.length;
      if (updated > 0) {
        dispatch({
          type: 'applyRefresh',
          cards: outcome.cards,
          products: outcome.products,
          pricesAsOf: outcome.pricesAsOf,
          at: now(),
        });
      }
      setRefreshFailed(outcome.failedBatches > 0);
    } catch {
      setRefreshFailed(true);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      items: state.items,
      meta: state.meta,
      isLoaded: state.isLoaded,
      refreshing,
      refreshFailed,
      addCard,
      addCards,
      addSealed,
      setQuantity,
      remove,
      refreshCard,
      refreshSealed,
      refreshPrices,
      setPaid,
      setBinder,
    }),
    [
      state,
      refreshing,
      refreshFailed,
      addCard,
      addCards,
      addSealed,
      setQuantity,
      remove,
      refreshCard,
      refreshSealed,
      refreshPrices,
      setPaid,
      setBinder,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

function now(): string {
  return new Date().toISOString();
}

function sanitizeMeta(value: CollectionMeta | null): CollectionMeta {
  if (!value || typeof value !== 'object') return EMPTY_META;
  return {
    lastRefreshAt: typeof value.lastRefreshAt === 'string' ? value.lastRefreshAt : null,
    pricesAsOf: typeof value.pricesAsOf === 'string' ? value.pricesAsOf : null,
    valueHistory: Array.isArray(value.valueHistory) ? value.valueHistory : [],
  };
}
