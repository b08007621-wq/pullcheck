import type { ModelKind } from '@/three/models';

export type SealedType =
  | 'case'
  | 'display'
  | 'pcEtb'
  | 'etb'
  | 'halfBox'
  | 'boosterBox'
  | 'boosterBundle'
  | 'sleevedBooster'
  | 'buildBattle'
  | 'threePack'
  | 'twoPack'
  | 'blister'
  | 'miniTin'
  | 'exBox'
  | 'tin'
  | 'upc'
  | 'spc'
  | 'premiumCollection'
  | 'specialCollection'
  | 'posterCollection'
  | 'boosterPack'
  | 'deck'
  | 'collection'
  | 'other';

const RULES: [RegExp, SealedType][] = [
  [/\bcase\b/, 'case'],
  [/\bdisplay\b/, 'display'],
  [/\s\+\s|set of \d|art bundle/, 'collection'],
  [/pokemon center elite trainer box/, 'pcEtb'],
  [/elite trainer box/, 'etb'],
  [/half booster box/, 'halfBox'],
  [/booster box/, 'boosterBox'],
  [/booster bundle/, 'boosterBundle'],
  [/sleeved booster/, 'sleevedBooster'],
  [/build (&|and) battle box/, 'buildBattle'],
  [/3 ?-?pack blister/, 'threePack'],
  [/2 ?-?pack blister/, 'twoPack'],
  [/blister/, 'blister'],
  [/mini tin/, 'miniTin'],
  [/\bex box\b/, 'exBox'],
  [/\btins?\b/, 'tin'],
  [/ultra.premium collection/, 'upc'],
  [/super.premium collection/, 'spc'],
  [/premium collection/, 'premiumCollection'],
  [/special collection/, 'specialCollection'],
  [/poster collection/, 'posterCollection'],
  [/booster pack/, 'boosterPack'],
  [/\bdecks?\b|precon/, 'deck'],
  [/collection|\bbox\b|bundle|trove|gift set/, 'collection'],
];

export const SEALED_TYPE_LABEL: Record<SealedType, string> = {
  case: 'Case',
  display: 'Display',
  pcEtb: 'Pokémon Center ETB',
  etb: 'Elite Trainer Box',
  halfBox: 'Half Booster Box',
  boosterBox: 'Booster Box',
  boosterBundle: 'Booster Bundle',
  sleevedBooster: 'Sleeved Booster',
  buildBattle: 'Build & Battle Box',
  threePack: '3-Pack Blister',
  twoPack: '2-Pack Blister',
  blister: 'Blister',
  miniTin: 'Mini Tin',
  exBox: 'ex Box',
  tin: 'Tin',
  upc: 'Ultra-Premium Collection',
  spc: 'Super-Premium Collection',
  premiumCollection: 'Premium Collection',
  specialCollection: 'Special Collection',
  posterCollection: 'Poster Collection',
  boosterPack: 'Booster Pack',
  deck: 'Deck',
  collection: 'Collection',
  other: 'Sealed',
};

const SORT_ORDER: SealedType[] = [
  'etb',
  'pcEtb',
  'boosterBox',
  'boosterBundle',
  'upc',
  'spc',
  'premiumCollection',
  'specialCollection',
  'posterCollection',
  'buildBattle',
  'exBox',
  'collection',
  'deck',
  'tin',
  'miniTin',
  'threePack',
  'twoPack',
  'blister',
  'sleevedBooster',
  'boosterPack',
  'halfBox',
  'other',
  'display',
  'case',
];

export function classifySealed(name: string): SealedType {
  const normalized = name.toLowerCase().replace(/é/g, 'e');
  for (const [pattern, type] of RULES) {
    if (pattern.test(normalized)) return type;
  }
  return 'other';
}

export function sealedTypeRank(type: SealedType): number {
  return SORT_ORDER.indexOf(type);
}

export type ProductModelKind = Exclude<ModelKind, 'card'>;

const MODEL_KINDS: Partial<Record<SealedType, ProductModelKind>> = {
  boosterPack: 'pack',
  sleevedBooster: 'sleeved',
  blister: 'blister',
  twoPack: 'blister2',
  threePack: 'blister3',
  boosterBundle: 'bundle',
  boosterBox: 'boosterbox',
  halfBox: 'boosterbox',
  etb: 'etb',
  pcEtb: 'pcetb',
  tin: 'tin',
  miniTin: 'minitin',
  collection: 'collection',
  exBox: 'collection',
  buildBattle: 'collection',
  specialCollection: 'special',
  premiumCollection: 'premium',
  posterCollection: 'poster',
  upc: 'large',
  spc: 'large',
};

export function productModelKind(name: string): ProductModelKind | null {
  if (/pok[eé] ?ball tin/i.test(name)) return null;
  return MODEL_KINDS[classifySealed(name)] ?? null;
}