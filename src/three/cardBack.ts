export type CardBack = 'international' | 'jp' | 'jpClassic' | 'plain' | 'ygo' | 'ygoOcg';

export const CARD_BACKS: Record<CardBack, number> = {
  international: require('../../assets/card-back.jpg'),
  jp: require('../../assets/card-back-jp.jpg'),
  jpClassic: require('../../assets/card-back-jp-classic.jpg'),
  plain: require('../../assets/card-back-plain.jpg'),
  ygo: require('../../assets/card-back-ygo.jpg'),
  ygoOcg: require('../../assets/card-back-ygo-ocg.jpg'),
};

export function parseCardBack(value: unknown): CardBack {
  return (Object.keys(CARD_BACKS) as CardBack[]).find((back) => back === value) ?? 'international';
}
