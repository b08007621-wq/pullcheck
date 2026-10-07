import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { readJson, STORAGE_KEYS, writeJson } from '@/services/storage';
import type { Binder } from '@/types/binder';
import { BINDER_COLORS, clearSlot, fillEmpty, isBinder, placeCard } from '@/utils/binderPages';

import { BinderContext } from './binderContext';

type Props = {
  children: ReactNode;
};

export function BinderProvider({ children }: Props) {
  const [binders, setBinders] = useState<Binder[]>([]);
  const [isLoaded, setLoaded] = useState(false);
  const bindersRef = useRef(binders);

  useEffect(() => {
    bindersRef.current = binders;
  });

  useEffect(() => {
    readJson<Binder[]>(STORAGE_KEYS.binders).then((saved) => {
      setBinders(Array.isArray(saved) ? saved.filter(isBinder) : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) writeJson(STORAGE_KEYS.binders, binders);
  }, [isLoaded, binders]);

  const change = useCallback((id: string, update: (binder: Binder) => Binder) => {
    setBinders((current) => current.map((binder) => (binder.id === id ? update(binder) : binder)));
  }, []);

  const nextColor = useCallback(
    () => BINDER_COLORS[bindersRef.current.length % BINDER_COLORS.length] ?? 'navy',
    [],
  );

  const create = useCallback(() => {
    const count = bindersRef.current.length;
    const binder: Binder = {
      id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: count === 0 ? 'My binder' : `Binder ${count + 1}`,
      color: BINDER_COLORS[count % BINDER_COLORS.length] ?? 'navy',
      slots: {},
      createdAt: new Date().toISOString(),
    };
    setBinders((current) => [...current, binder]);
    return binder.id;
  }, []);

  const update = useCallback(
    (id: string, changes: Partial<Pick<Binder, 'name' | 'color'>>) => change(id, (binder) => ({ ...binder, ...changes })),
    [change],
  );

  const removeBinder = useCallback((id: string) => {
    setBinders((current) => current.filter((binder) => binder.id !== id));
  }, []);

  const place = useCallback(
    (id: string, slot: number, key: string, from: number | null) =>
      change(id, (binder) => placeCard(binder, slot, key, from)),
    [change],
  );

  const unplace = useCallback((id: string, slot: number) => change(id, (binder) => clearSlot(binder, slot)), [change]);

  const fill = useCallback((id: string, keys: string[]) => change(id, (binder) => fillEmpty(binder, keys)), [change]);

  const value = useMemo(
    () => ({ binders, isLoaded, create, update, removeBinder, place, unplace, fill, nextColor }),
    [binders, isLoaded, create, update, removeBinder, place, unplace, fill, nextColor],
  );

  return <BinderContext.Provider value={value}>{children}</BinderContext.Provider>;
}
