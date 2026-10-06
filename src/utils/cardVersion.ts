import type { Card } from '@/types/card';
import type { CollectedCard } from '@/types/collection';

import { type Condition, CONDITION_FACTOR, CONDITION_LABEL } from './condition';
import {
  defaultVariant,
  getVariantOptions,
  getVariantPrice,
  type MarketPrice,
  variantLabel,
  variantShortLabel,
} from './price';

export type CardVersion = {
  variant: string | null;
  condition: Condition;
};

export function defaultVersion(card: Card): CardVersion {
  return { variant: defaultVariant(card), condition: 'NM' };
}

export function entryVersion(entry: CollectedCard): CardVersion {
  return { variant: entry.variant ?? null, condition: entry.condition ?? 'NM' };
}

export function resolveVersion(card: Card, version: CardVersion): CardVersion {
  const options = getVariantOptions(card);
  const variant = version.variant && options.includes(version.variant) ? version.variant : defaultVariant(card);
  return { variant, condition: version.condition };
}

export function sameVersion(first: CardVersion, second: CardVersion): boolean {
  return first.variant === second.variant && first.condition === second.condition;
}

export function cardVersionPrice(card: Card, version: CardVersion): MarketPrice | null {
  const base = getVariantPrice(card, version.variant);
  if (!base || version.condition === 'NM') return base;
  return { ...base, amount: Math.round(base.amount * CONDITION_FACTOR[version.condition] * 100) / 100 };
}

export function versionLabel(card: Card, version: CardVersion, style: 'short' | 'long' = 'long'): string | null {
  const parts: string[] = [];
  if (version.variant && getVariantOptions(card).length > 1) {
    parts.push(style === 'short' ? variantShortLabel(version.variant) : variantLabel(version.variant));
  }
  if (version.condition !== 'NM') {
    parts.push(style === 'short' ? version.condition : CONDITION_LABEL[version.condition]);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
