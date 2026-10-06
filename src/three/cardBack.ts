export type CardBack = 'international' | 'jp' | 'jpClassic';

export const CARD_BACKS: Record<CardBack, number> = {
  international: require('../../assets/card-back.jpg'),
  jp: require('../../assets/card-back-jp.jpg'),
  jpClassic: require('../../assets/card-back-jp-classic.jpg'),
};

export function parseCardBack(value: unknown): CardBack {
  return value === 'jp' || value === 'jpClassic' ? value : 'international';
}
