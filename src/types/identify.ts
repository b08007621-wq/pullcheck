import type { Card } from './card';

export type ReadingConfidence = 'high' | 'medium' | 'low';

export type CardFinish = 'normal' | 'holo' | 'reverse' | 'unknown';

export type CardReading = {
  isPokemonCard: boolean;
  name: string;
  collectorNumber: string;
  setCode: string;
  hp: string;
  language: string;
  confidence: ReadingConfidence;
  finish: CardFinish;
  notes: string;
};

export type CardMatch =
  | { status: 'single'; card: Card }
  | { status: 'multiple'; cards: Card[] }
  | { status: 'none' };

export type IdentifyStage = 'idle' | 'reading' | 'matching' | 'done' | 'error';
