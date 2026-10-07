import type { CardBack } from '@/three/cardBack';
import type { Card } from '@/types/card';
import type { SealedProduct } from '@/types/sealed';

import { parseDate } from './date';
import { gameOf } from './game';

const LAST_CLASSIC_RELEASE = new Date(2001, 4, 1);

const CLASSIC_GROUP_IDS = new Set([
  23720, 23721, 23722, 23723, 23724, 23725, 23726, 23727, 23728, 23729, 23740, 24013, 24017, 24018, 24019, 24160,
  24161, 24168, 24169, 24175, 24494, 24597, 24598,
]);

export function singleBack(product: SealedProduct): CardBack {
  if (product.market !== 'jp') return 'international';
  const released = parseDate(product.groupReleasedOn);
  if (released) return released < LAST_CLASSIC_RELEASE ? 'jpClassic' : 'jp';
  return CLASSIC_GROUP_IDS.has(product.groupId) ? 'jpClassic' : 'jp';
}

export function gameBack(card: Card): CardBack {
  const game = gameOf(card);
  if (game === 'yugioh') return card.lang === 'ja' ? 'ygoOcg' : 'ygo';
  return game === 'pokemon' ? 'international' : 'plain';
}
