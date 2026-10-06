import type { Card } from '@/types/card';
import type { CollectionItem } from '@/types/collection';
import type { CardFinish } from '@/types/identify';
import type { Pull, Rip, RipSource } from '@/types/rip';

import { cardVersionPrice } from './cardVersion';
import { currentMsrp } from './msrp';
import { defaultVariant, getVariantOptions, type MarketPrice, percentChange } from './price';
import { getSealedMarketPrice } from './sealed';
import { classifySealed, SEALED_TYPE_LABEL, type SealedType } from './sealedType';

export type RipOption = RipSource & {
  id: string;
  detail: string;
};

export type RipSummary = {
  totalUsd: number;
  count: number;
  unpriced: number;
  result: number;
  percent: number | null;
  perPack: number | null;
};

const PACKS: Partial<Record<SealedType, number>> = {
  boosterPack: 1,
  sleevedBooster: 1,
  twoPack: 2,
  miniTin: 2,
  threePack: 3,
  buildBattle: 4,
  boosterBundle: 6,
  etb: 9,
  pcEtb: 11,
  halfBox: 18,
  boosterBox: 36,
};

const PRESETS: SealedType[] = ['boosterPack', 'threePack', 'boosterBundle', 'etb', 'boosterBox'];

const FINISH_VARIANT: Partial<Record<CardFinish, string>> = {
  normal: 'normal',
  holo: 'holofoil',
  reverse: 'reverseHolofoil',
};

export function presetOptions(): RipOption[] {
  return PRESETS.flatMap((type) => {
    const cost = currentMsrp(type);
    if (cost === null) return [];
    const packs = PACKS[type] ?? null;
    return [
      {
        id: `preset:${type}`,
        title: SEALED_TYPE_LABEL[type],
        cost,
        packs,
        sourceKey: null,
        imageUrl: null,
        setName: null,
        detail: packs && packs > 1 ? `${packs} packs · MSRP` : 'MSRP',
      },
    ];
  });
}

export function ownedOptions(items: CollectionItem[]): RipOption[] {
  return items.flatMap((item) => {
    if (item.kind !== 'sealed' || item.product.cardNumber) return [];
    const type = classifySealed(item.product.name);
    const market = getSealedMarketPrice(item.product);
    const marketUsd = market?.currency === 'USD' ? market.amount : null;
    const cost = item.paid?.amount ?? marketUsd ?? currentMsrp(type) ?? 0;
    const basis = item.paid ? 'You paid' : marketUsd !== null ? 'Market' : 'MSRP';
    const packs = PACKS[type] ?? null;
    return [
      {
        id: item.key,
        title: item.product.name,
        cost,
        packs,
        sourceKey: item.key,
        imageUrl: item.product.imageUrl,
        setName: item.product.setName,
        detail: packs && packs > 1 ? `${packs} packs · ${basis}` : basis,
      },
    ];
  });
}

export function variantForFinish(card: Card, finish: CardFinish | undefined): string | null {
  const wanted = finish ? FINISH_VARIANT[finish] : undefined;
  return wanted && getVariantOptions(card).includes(wanted) ? wanted : defaultVariant(card);
}

export function nextVariant(pull: Pull): string | null {
  const options = getVariantOptions(pull.card);
  if (options.length < 2) return pull.variant;
  const index = pull.variant ? options.indexOf(pull.variant) : -1;
  return options[(index + 1) % options.length] ?? pull.variant;
}

export function pullPrice(pull: Pull): MarketPrice | null {
  return cardVersionPrice(pull.card, { variant: pull.variant, condition: 'NM' });
}

export function rankPulls(pulls: Pull[]): Pull[] {
  return [...pulls].sort((first, second) => (pullValueUsd(second) ?? -1) - (pullValueUsd(first) ?? -1));
}

export function summarizeRip(rip: Rip): RipSummary {
  let total = 0;
  let unpriced = 0;
  for (const pull of rip.pulls) {
    const value = pullValueUsd(pull);
    if (value === null) unpriced += 1;
    else total += value;
  }
  const totalUsd = cents(total);
  return {
    totalUsd,
    count: rip.pulls.length,
    unpriced,
    result: cents(totalUsd - rip.cost),
    percent: percentChange(rip.cost, totalUsd),
    perPack: rip.packs && rip.packs > 1 ? cents(totalUsd / rip.packs) : null,
  };
}

function pullValueUsd(pull: Pull): number | null {
  const price = pullPrice(pull);
  return price?.currency === 'USD' ? price.amount : null;
}

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}
