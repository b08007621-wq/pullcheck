import type { FoilKind } from '@/three/cardFinish';
import type { Card } from '@/types/card';

import { gameOf } from './game';

const MTG_PROMO_FOILS: [RegExp, FoilKind][] = [
  [/^galaxyfoil$|^confettifoil$|^starlightfoil$/, 'cosmos'],
  [/^surgefoil$|^rainbowfoil$|^doublerainbow$|^singularityfoil$|^cosmicfoil$/, 'rainbow'],
  [/^gilded$|^goldfoil$|^gold$|^embossed$/, 'gold'],
  [/^oilslick$|^halofoil$|^fracturefoil$|^manafoil$|^ripplefoil$|^raisedfoil$|^silverfoil$|^dragonscalefoil$/, 'chrome'],
  [/^textured$|^neonink$|^stepandcompleat$/, 'textured'],
  [/^serialized$|^invisibleink$|^headliner$/, 'special'],
];

const YGO_RARITIES: [RegExp, FoilKind][] = [
  [/quarter century|starlight|platinum secret|prismatic|ultimate rare|ghost|collector/i, 'special'],
  [/gold|premium/i, 'gold'],
  [/secret/i, 'cosmos'],
  [/ultra|super|parallel|starfoil|shatterfoil|mosaic|duel terminal/i, 'full'],
];

const LORCANA_RARITIES: [RegExp, FoilKind][] = [
  [/enchanted/i, 'rainbow'],
  [/epic/i, 'special'],
  [/iconic/i, 'gold'],
];

export function otherGameFoil(card: Card, variant: string | null | undefined): FoilKind {
  const game = gameOf(card);
  const tags = card.finishTags ?? [];
  const foiled = Boolean(variant && /foil/i.test(variant));
  if (game === 'mtg') {
    if (variant && /etched/i.test(variant)) return 'textured';
    const onlyFoil = tags.includes('only-foil');
    if (!foiled && !onlyFoil) return 'plain';
    for (const tag of tags) {
      const found = MTG_PROMO_FOILS.find(([rule]) => rule.test(tag))?.[1];
      if (found) return found;
    }
    return tags.includes('borderless') || tags.includes('fullart') || tags.includes('showcase') ? 'illustration' : 'full';
  }
  if (game === 'yugioh') {
    return YGO_RARITIES.find(([rule]) => rule.test(card.rarity ?? ''))?.[1] ?? 'plain';
  }
  const ruled = LORCANA_RARITIES.find(([rule]) => rule.test(card.rarity ?? ''))?.[1];
  if (ruled) return ruled;
  return foiled ? 'full' : 'plain';
}
