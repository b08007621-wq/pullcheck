import type { Card } from '@/types/card';
import type { SealedProduct } from '@/types/sealed';

export type FoilKind = 'plain' | 'window' | 'full' | 'textured' | 'gold' | 'pikachu' | 'reverse' | 'cosmos';

export type BorderFoil = 'none' | 'silver' | 'gold';

export type CardEra = 'wotc' | 'ex' | 'bw' | 'swsh' | 'sv';

export type UvRect = [number, number, number, number];

export type CardFinish = {
  foil: FoilKind;
  border: BorderFoil;
  era: CardEra;
  window?: UvRect | null;
};

const PLAIN: CardFinish = { foil: 'plain', border: 'none', era: 'sv' };

const ART_WINDOWS: Record<CardEra, UvRect> = {
  wotc: [0.11, 0.5, 0.89, 0.885],
  ex: [0.085, 0.515, 0.915, 0.895],
  bw: [0.091, 0.511, 0.906, 0.886],
  swsh: [0.086, 0.531, 0.916, 0.881],
  sv: [0.087, 0.531, 0.914, 0.886],
};

const REVERSE_VARIANT = /^reverse/i;
const HOLO_VARIANT = /holofoil/i;
const PROMO = /^promo$/;
const COSMOS = /cosmos/i;
const RULE_BOX = /^(ex|EX|GX|V|VMAX|VSTAR|V-UNION|MEGA|TAG TEAM|BREAK|LV\.X|Prime|LEGEND|Radiant)$/;

const PIKACHU = /pikachu rare/;
const GOLD = /hyper rare|rare secret gold|gold star/;
const TEXTURED =
  /special illustration|illustration rare|ultra|full art|vmax|vstar|rainbow|secret|trainer gallery|shiny|ace spec|character|black white rare|mega attack/;
const FULL = /double rare|holo ex|holo gx|holo v\b|holo lv|legend|amazing|radiant|shining|holo star|prism|break|futuristic|prime/;
const WINDOW = /holo|promo|classic/;
const MODERN_RARE = /^rare$/;

const JP_GOLD = /ultra rare|\bur\b|\bmur\b|hyper rare|gold/;
const JP_TEXTURED =
  /special art|art rare|super rare|secret|\bsar\b|\bar\b|\bsr\b|\bssr\b|\bhr\b|\bbwr\b|\bchr\b|\bcsr\b|character|mega attack|illustration|black white|shiny super/;
const JP_FULL = /double rare|triple rare|\brr\b|\brrr\b|shiny rare|\bs\b|ace spec|radiant|amazing|prism|holo (ex|gx|v)|\bk\b/;
const JP_WINDOW = /holo|^rare$|\br\b|promo|celebration|anniversary/;
const JP_PLAIN = /^(common|uncommon|\bc\b|\bu\b|none|no rarity)?$/;
const JP_PATTERN = /master ?ball|pok[eé] ?ball|reverse|mirror|pattern/i;
const JP_RULE_NAME = / (ex|EX|GX|V|VMAX|VSTAR)\b/;

export function cardFinish(card: Card, variant?: string | null): CardFinish {
  const rarity = (card.rarity ?? '').toLowerCase();
  const era = eraOf(card.set.series);
  const border = borderOf(card.set.name);
  if (variant && REVERSE_VARIANT.test(variant)) return { foil: 'reverse', border, era };
  if (variant && !HOLO_VARIANT.test(variant)) return { foil: 'plain', border, era };

  const variants = Object.keys(card.tcgplayer?.prices ?? {});
  const holo = variants.some((key) => HOLO_VARIANT.test(key) && !REVERSE_VARIANT.test(key));
  let foil = PROMO.test(rarity) ? promoFoil(card) : foilOf(rarity, era);
  if (!variant && variants.length > 0 && !holo) foil = 'plain';
  else if ((holo || variant) && foil === 'plain') foil = 'window';
  if (COSMOS.test(card.printing ?? '') && (foil === 'window' || foil === 'plain')) foil = 'cosmos';
  return { foil, border, era };
}

export function singleFinish(product: SealedProduct): CardFinish {
  const rarity = (product.rarity ?? '').toLowerCase().trim();
  const era = singleEra(product.setCode);
  if (JP_PATTERN.test(product.name)) return { foil: 'reverse', border: 'none', era };
  const foil: FoilKind = JP_GOLD.test(rarity)
    ? 'gold'
    : JP_TEXTURED.test(rarity)
      ? 'textured'
      : JP_FULL.test(rarity) || (JP_RULE_NAME.test(product.name) && !JP_PLAIN.test(rarity))
        ? 'full'
        : JP_WINDOW.test(rarity) || !JP_PLAIN.test(rarity)
          ? 'window'
          : 'plain';
  return { foil, border: foil === 'plain' ? 'none' : 'silver', era };
}

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

export function parseFinish(foil: unknown, border: unknown, era: unknown): CardFinish {
  return {
    foil: isOneOf(foil, ['plain', 'window', 'full', 'textured', 'gold', 'pikachu', 'reverse', 'cosmos'])
      ? foil
      : PLAIN.foil,
    border: isOneOf(border, ['none', 'silver', 'gold']) ? border : PLAIN.border,
    era: isOneOf(era, ['wotc', 'ex', 'bw', 'swsh', 'sv']) ? era : PLAIN.era,
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
  if (PIKACHU.test(rarity)) return 'pikachu';
  if (GOLD.test(rarity)) return 'gold';
  if (TEXTURED.test(rarity)) return 'textured';
  if (FULL.test(rarity)) return 'full';
  if (WINDOW.test(rarity)) return 'window';
  if (era === 'sv' && MODERN_RARE.test(rarity)) return 'window';
  return 'plain';
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
