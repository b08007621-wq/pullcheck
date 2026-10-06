import { createContext } from 'react';

export type CelebrateRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CelebrateOptions = {
  image?: string | null;
  amount?: number | null;
  from?: CelebrateRect | null;
  delay?: number;
  count?: number;
  fly?: boolean;
};

export type CelebrateBurst = Required<Omit<CelebrateOptions, 'from'>> & {
  id: number;
  from: CelebrateRect | null;
};

export type CelebrateBump = {
  id: number;
  count: number;
};

export type FreshPull = {
  id: number;
  title: string;
  totalUsd: number;
  cards: { id: string; name: string; image: string | null; amount: number | null }[];
};

export type CelebrateContextValue = {
  celebrate: (options: CelebrateOptions) => void;
  bump: CelebrateBump | null;
  setTarget: (point: { x: number; y: number }) => void;
  fresh: FreshPull | null;
  showFresh: (pull: Omit<FreshPull, 'id'>) => void;
  clearFresh: () => void;
};

export const CelebrateContext = createContext<CelebrateContextValue>({
  celebrate: () => {},
  bump: null,
  setTarget: () => {},
  fresh: null,
  showFresh: () => {},
  clearFresh: () => {},
});
