import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { readJson, STORAGE_KEYS, writeJson } from '@/services/storage';
import type { Card } from '@/types/card';
import type { CardFinish } from '@/types/identify';
import type { Pull, Rip, RipSource } from '@/types/rip';
import { variantForFinish } from '@/utils/rip';

import { RipContext } from './ripContext';

type Props = {
  children: ReactNode;
};

export function RipProvider({ children }: Props) {
  const [rip, setRip] = useState<Rip | null>(null);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    readJson<Rip>(STORAGE_KEYS.rip).then((saved) => {
      setRip((current) => current ?? (isRip(saved) ? saved : null));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) writeJson(STORAGE_KEYS.rip, rip);
  }, [isLoaded, rip]);

  const start = useCallback(
    (source: RipSource) => setRip({ ...source, id: newId(), startedAt: now(), pulls: [] }),
    [],
  );

  const addPull = useCallback((card: Card, finish: CardFinish) => {
    const pull: Pull = { id: newId(), card, finish, variant: variantForFinish(card, finish), pulledAt: now() };
    setRip((current) => (current ? { ...current, pulls: [...current.pulls, pull] } : current));
  }, []);

  const removePull = useCallback((id: string) => {
    setRip((current) => (current ? { ...current, pulls: current.pulls.filter((pull) => pull.id !== id) } : current));
  }, []);

  const setPullVariant = useCallback((id: string, variant: string | null) => {
    setRip((current) =>
      current
        ? { ...current, pulls: current.pulls.map((pull) => (pull.id === id ? { ...pull, variant } : pull)) }
        : current,
    );
  }, []);

  const setCost = useCallback((cost: number) => {
    setRip((current) => (current ? { ...current, cost } : current));
  }, []);

  const end = useCallback(() => setRip(null), []);

  const value = useMemo(
    () => ({ rip, isLoaded, start, addPull, removePull, setPullVariant, setCost, end }),
    [rip, isLoaded, start, addPull, removePull, setPullVariant, setCost, end],
  );

  return <RipContext.Provider value={value}>{children}</RipContext.Provider>;
}

function isRip(value: Rip | null): value is Rip {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.pulls) && typeof value.cost === 'number');
}

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}
