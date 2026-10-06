import type { Card } from './card';
import type { CardFinish } from './identify';

export type Pull = {
  id: string;
  card: Card;
  variant: string | null;
  finish: CardFinish;
  pulledAt: string;
};

export type RipSource = {
  title: string;
  cost: number;
  packs: number | null;
  sourceKey: string | null;
  imageUrl: string | null;
  setName?: string | null;
};

export type Rip = RipSource & {
  id: string;
  startedAt: string;
  pulls: Pull[];
};
