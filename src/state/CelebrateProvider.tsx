import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CelebrateLayer } from '@/components/CelebrateLayer';

import {
  type CelebrateBump,
  type CelebrateBurst,
  CelebrateContext,
  type CelebrateOptions,
  type FreshPull,
} from './celebrateContext';

type Props = {
  children: ReactNode;
};

export function CelebrateProvider({ children }: Props) {
  const [bursts, setBursts] = useState<CelebrateBurst[]>([]);
  const [bump, setBump] = useState<CelebrateBump | null>(null);
  const [fresh, setFresh] = useState<FreshPull | null>(null);
  const target = useRef<{ x: number; y: number } | null>(null);
  const sequence = useRef(0);

  const celebrate = useCallback((options: CelebrateOptions) => {
    sequence.current += 1;
    const burst: CelebrateBurst = {
      id: sequence.current,
      image: options.image ?? null,
      amount: options.amount ?? null,
      from: options.from ?? null,
      delay: options.delay ?? 0,
      count: options.count ?? 1,
      fly: options.fly ?? true,
    };
    setBursts((current) => [...current.slice(-4), burst]);
  }, []);

  const arrive = useCallback((burst: CelebrateBurst) => {
    setBump({ id: burst.id, count: burst.count });
  }, []);

  const land = useCallback((burst: CelebrateBurst) => {
    setBursts((current) => current.filter((entry) => entry.id !== burst.id));
  }, []);

  const setTarget = useCallback((point: { x: number; y: number }) => {
    target.current = point;
  }, []);

  const showFresh = useCallback((pull: Omit<FreshPull, 'id'>) => {
    sequence.current += 1;
    setFresh({ ...pull, id: sequence.current });
  }, []);

  const clearFresh = useCallback(() => setFresh(null), []);

  const value = useMemo(
    () => ({ celebrate, bump, setTarget, fresh, showFresh, clearFresh }),
    [celebrate, bump, setTarget, fresh, showFresh, clearFresh],
  );

  return (
    <CelebrateContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <CelebrateLayer bursts={bursts} target={target} onArrive={arrive} onLand={land} />
      </View>
    </CelebrateContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
