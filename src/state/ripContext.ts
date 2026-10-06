import { createContext } from 'react';

import type { Card } from '@/types/card';
import type { CardFinish } from '@/types/identify';
import type { Rip, RipSource } from '@/types/rip';

export type RipContextValue = {
  rip: Rip | null;
  isLoaded: boolean;
  start: (source: RipSource) => void;
  addPull: (card: Card, finish: CardFinish) => void;
  removePull: (id: string) => void;
  setPullVariant: (id: string, variant: string | null) => void;
  setCost: (cost: number) => void;
  end: () => void;
};

export const RipContext = createContext<RipContextValue>({
  rip: null,
  isLoaded: false,
  start: () => {},
  addPull: () => {},
  removePull: () => {},
  setPullVariant: () => {},
  setCost: () => {},
  end: () => {},
});
