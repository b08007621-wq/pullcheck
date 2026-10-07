import { createContext } from 'react';

import type { Binder, BinderColor } from '@/types/binder';

export type BinderContextValue = {
  binders: Binder[];
  isLoaded: boolean;
  create: () => string;
  update: (id: string, changes: Partial<Pick<Binder, 'name' | 'color'>>) => void;
  removeBinder: (id: string) => void;
  place: (id: string, slot: number, key: string, from: number | null) => void;
  unplace: (id: string, slot: number) => void;
  fill: (id: string, keys: string[]) => void;
  nextColor: () => BinderColor;
};

export const BinderContext = createContext<BinderContextValue>({
  binders: [],
  isLoaded: false,
  create: () => '',
  update: () => {},
  removeBinder: () => {},
  place: () => {},
  unplace: () => {},
  fill: () => {},
  nextColor: () => 'navy',
});
