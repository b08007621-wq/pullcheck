import type { Card } from '@/types/card';
import type { SealedProduct } from '@/types/sealed';
import { isOtherGame } from '@/utils/game';

export type FoilKind =
  | 'plain'
  | 'window'
  | 'full'
  | 'textured'
  | 'gold'
  | 'pikachu'
  | 'reverse'
  | 'cosmos'
  | 'rainbow'
  | 'illustration'
  | 'special'
  | 'chrome'
  | 'shiny';

export type HoloPattern = 'starlight' | 'cosmos' | 'tinsel' | 'sheen' | 'waterweb' | 'line' | 'mirage';

export const FOIL_KINDS: readonly FoilKind[] = [
  'plain',
  'window',
  'full',
  'textured',
  'gold',
  'pikachu',
  'reverse',
  'cosmos',
  'rainbow',
  'illustration',
  'special',
  'chrome',
  'shiny',
];

const PATTERNS: readonly HoloPattern[] = ['starlight', 'cosmos', 'tinsel', 'sheen', 'waterweb', 'line', 'mirage'];

export type BorderFoil = 'none' | 'silver' | 'gold';

export type CardEra = 'wotc' | 'ex' | 'bw' | 'swsh' | 'sv';

export type UvRect = [number, number, number, number];

export type CardFinish = {
  foil: FoilKind;
  border: BorderFoil;
  era: CardEra;
  pattern: HoloPattern;
  window?: UvRect | null;
};

const PLAIN: CardFinish = { foil: 'plain', border: 'none', era: 'sv', pattern: 'mirage' };

const ART_WINDOWS: Record<CardEra, UvRect> = {
  wotc: [0.11, 0.5, 0.89, 0.885],
  ex: [0.085, 0.515, 0.915, 0.895],
  bw: [0.091, 0.511, 0.906, 0.886],
  swsh: [0.086, 0.531, 0.916, 0.881],
  sv: [0.087, 0.531, 0.914, 0.886],
};

const REVERSE_VARIANT = /^reverse/i;
const ALL_FOIL_SET = /30th celebration$/i;
const HOLO_VARIANT = /holofoil/i;
const PROMO = /^promo$/;
const COSMOS = /cosmos/i;
const RULE_BOX = /^(ex|EX|GX|V|VMAX|VSTAR|V-UNION|MEGA|TAG TEAM|BREAK|LV\.X|Prime|LEGEND|Radiant)$/;

const RARITY_RULES: [RegExp, FoilKind][] = [
  [/pikachu rare/, 'pikachu'],
  [/futuristic/, 'chrome'],
  [/rainbow/, 'rainbow'],
  [/hyper rare|rare secret|gold star|\bgold\b/, 'gold'],
  [/special illustration|mega attack|black white rare/, 'special'],
  [/illustration rare|trainer gallery|character/, 'illustration'],
  [/shiny|shining|radiant/, 'shiny'],
  [/ultra|full art|vmax|vstar|ace spec|amazing/, 'textured'],
  [/double rare|holo ex|holo gx|holo v\b|holo lv|legend|holo star|prism|break|prime/, 'full'],
  [/holo|promo|classic/, 'window'],
];
const MODERN_RARE = /^rare$/;

const JP_RULES: [RegExp, FoilKind][] = [
  [/special art|\bsar\b|character super|\bcsr\b|mega attack|\bma\b|black white|\bbwr\b/, 'special'],
  [/art rare|\bar\b|character|\bchr\b|illustration/, 'illustration'],
  [/hyper rare|\bhr\b/, 'rainbow'],
  [/ultra rare|\bur\b|\bmur\b|gold/, 'gold'],
  [/shiny|\bssr\b|\bs\b/, 'shiny'],
  [/super rare|secret|\bsr\b/, 'textured'],
  [/double rare|triple rare|\brr\b|\brrr\b|ace spec|radiant|amazing|prism|holo (ex|gx|v)|\bk\b/, 'full'],
];
const JP_WINDOW = /holo|^rare$|\br\b|promo|celebration|anniversary/;
const JP_PLAIN = /^(common|uncommon|\bc\b|\bu\b|none|no rarity)?$/;
const JP_PATTERN = /master ?ball|pok[eé] ?ball|reverse|mirror|pattern/i;
const JP_RULE_NAME = / (ex|EX|GX|V|VMAX|VSTAR)\b/;

export function cardFinish(card: Card, variant?: string | null): CardFinish {
  const rarity = (card.rarity ?? '').toLowerCase();
  const era = eraOf(card.set.series);
  const border = borderOf(card.set.name);
  const pattern = patternOf(card.set.series, card.set.name);
  if (isOtherGame(card)) return { foil: variant && /foil/i.test(variant) ? 'full' : 'plain', border, era, pattern };
  if (variant && REVERSE_VARIANT.test(variant)) return { foil: 'reverse', border, era, pattern };
  if (variant && !HOLO_VARIANT.test(variant) && !ALL_FOIL_SET.test(card.set.name)) {
    return { foil: 'plain', border, era, pattern };
  }

  const variants = Object.keys(card.tcgplayer?.prices ?? {});
  const holo = variants.some((key) => HOLO_VARIANT.test(key) && !REVERSE_VARIANT.test(key));
  let foil = PROMO.test(rarity) ? promoFoil(card) : foilOf(rarity, era);
  if (!variant && variants.length > 0 && !holo) foil = 'plain';
  else if ((holo || variant) && foil === 'plain') foil = 'window';
  if (COSMOS.test(card.printing ?? '') && (foil === 'window' || foil === 'plain')) foil = 'cosmos';
  if (ALL_FOIL_SET.test(card.set.name) && foil === 'plain') foil = 'window';
  return { foil, border, era, pattern };
}

export function singleFinish(product: SealedProduct): CardFinish {
  const rarity = (product.rarity ?? '').toLowerCase().trim();
  const era = singleEra(product.setCode);
  const pattern = ERA_PATTERN[era];
  if (JP_PATTERN.test(product.name)) return { foil: 'reverse', border: 'none', era, pattern };
  const ruled = JP_RULES.find(([rule]) => rule.test(rarity))?.[1];
  const foil: FoilKind =
    ruled ??
    (JP_RULE_NAME.test(product.name) && !JP_PLAIN.test(rarity)
      ? 'full'
      : JP_WINDOW.test(rarity) || !JP_PLAIN.test(rarity)
        ? 'window'
        : 'plain');
  return { foil, border: foil === 'plain' ? 'none' : 'silver', era, pattern };
}

const ERA_PATTERN: Record<CardEra, HoloPattern> = {
  wotc: 'cosmos',
  ex: 'cosmos',
  bw: 'tinsel',
  swsh: 'line',
  sv: 'mirage',
};

function singleEra(code: string | null | undefined): CardEra {
  const value = (code ?? '').toLowerCase();
  if (/^(sv|m)/.test(value)) return 'sv';
  if (/^(s|sm)/.test(value)) return 'swsh';
  if (/^(xy|bw|cp)/.test(value)) return 'bw';
  if (/^(dp|pt|l\d|ll|adv|pcg)/.test(value)) return 'ex';
  return 'sv';
}

export function artWindow(era: CardEra): UvRect {
  return ART_WINDOWS[era];
}

export function parseFinish(foil: unknown, border: unknown, era: unknown, pattern?: unknown): CardFinish {
  const parsedEra = isOneOf(era, ['wotc', 'ex', 'bw', 'swsh', 'sv']) ? era : PLAIN.era;
  return {
    foil: isOneOf(foil, FOIL_KINDS) ? foil : PLAIN.foil,
    border: isOneOf(border, ['none', 'silver', 'gold']) ? border : PLAIN.border,
    era: parsedEra,
    pattern: isOneOf(pattern, PATTERNS) ? pattern : ERA_PATTERN[parsedEra],
  };
}

export function needsArtWindow(finish: CardFinish): boolean {
  return ['window', 'pikachu', 'reverse', 'full', 'cosmos'].includes(finish.foil);
}

export function withLayout(finish: CardFinish, window: UvRect | null | undefined): CardFinish {
  if (window === undefined) return finish;
  if (window === null) {
    if (finish.foil === 'window' || finish.foil === 'cosmos') return { ...finish, foil: 'full' };
    if (finish.foil === 'full') return { ...finish, foil: 'textured' };
    if (finish.foil === 'reverse') return { ...finish, foil: 'plain' };
    return finish;
  }
  return { ...finish, window };
}

function promoFoil(card: Card): FoilKind {
  const subtypes = card.subtypes ?? [];
  const ruleBox = subtypes.some((subtype) => RULE_BOX.test(subtype)) || / (ex|EX|GX|V|VMAX|VSTAR)$/.test(card.name);
  return ruleBox ? 'full' : 'window';
}

function foilOf(rarity: string, era: CardEra): FoilKind {
  const ruled = RARITY_RULES.find(([rule]) => rule.test(rarity))?.[1];
  if (ruled) return ruled;
  if (era === 'sv' && MODERN_RARE.test(rarity)) return 'window';
  return 'plain';
}

function patternOf(series: string, setName: string): HoloPattern {
  if (/^(base|jungle|fossil)$/i.test(setName.trim())) return 'starlight';
  if (/^(base|gym|neo|legendary collection|e-card|other|ex|diamond|platinum|heartgold|pop|call of legends|np)/i.test(series)) {
    return 'cosmos';
  }
  if (/^black/i.test(series)) return 'tinsel';
  if (/^xy/i.test(series)) return 'sheen';
  if (/^sun/i.test(series)) return 'waterweb';
  if (/^sword/i.test(series)) return 'line';
  return 'mirage';
}

function borderOf(setName: string): BorderFoil {
  if (/classic collection/i.test(setName)) return 'gold';
  if (/30th celebration/i.test(setName)) return 'silver';
  return 'none';
}

function eraOf(series: string): CardEra {
  if (/^(base|gym|neo|legendary collection|e-card)/i.test(series)) return 'wotc';
  if (/^(ex|diamond|platinum|heartgold|pop|nintendo)/i.test(series)) return 'ex';
  if (/^(black|xy|sun)/i.test(series)) return 'bw';
  if (/^sword/i.test(series)) return 'swsh';
  return 'sv';
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}
