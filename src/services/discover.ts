import type { Card } from '@/types/card';
import type { SetInfo } from '@/types/set';
import { getMarketPrice } from '@/utils/price';

import { enrichCardPrices } from './cardPrices';
import { getSetCards } from './pokemonTcg';
import { compareSnapshots, dayStamp, recordSnapshot } from './priceSnapshots';
import { loadSets } from './sets';

export type DiscoverPick = {
  card: Card;
  price: number;
  change: number | null;
};

export type Discover = {
  sets: SetInfo[];
  pricedSetNames: string[];
  chase: DiscoverPick[];
  sleepers: DiscoverPick[];
  rising: DiscoverPick[];
  risingSince: string | null;
  trackedDays: number;
};

const NEWEST_SETS = 3;
const CANDIDATE_SETS = 9;
const MIN_PRICED_SHARE = 0.3;
const ENRICH_TIMEOUT_MS = 3500;
const LIST_SIZE = 12;
const MIN_SET_SIZE = 60;
const SKIP_SET = /promo|energ|trainer kit|mcdonald|trick or trade|classic collection/i;
const SKIP_SERIES = /^(other|pop|np)$/i;
const CHASE_RARITY = /illustration|ultra|hyper|special|secret|rainbow/i;
const SLEEPER_DISCOUNT = 0.35;
const SLEEPER_FLOOR = 4;
const RISING_FLOOR = 3;
const RISING_MIN_CHANGE = 0.08;
const RISING_WINDOW_DAYS = 7;

export async function loadDiscover(signal?: AbortSignal): Promise<Discover> {
  const today = dayStamp();
  const candidates = (await loadSets(signal))
    .filter((set) => set.total >= MIN_SET_SIZE && !SKIP_SET.test(set.name) && !SKIP_SERIES.test(set.series))
    .filter((set) => set.releaseDate.replace(/\//g, '-') <= today)
    .sort((first, second) => second.releaseDate.localeCompare(first.releaseDate))
    .slice(0, CANDIDATE_SETS);

  const pricedAll: DiscoverPick[] = [];
  const pricedSets = new Set<string>();
  for (let start = 0; start < candidates.length && pricedSets.size < NEWEST_SETS; start += NEWEST_SETS) {
    const batch = candidates.slice(start, start + NEWEST_SETS);
    const settled = await Promise.allSettled(batch.map((set) => getSetCards(set.id, signal)));
    const loaded = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value.value : []));
    const cards = await Promise.race([
      enrichCardPrices(loaded),
      new Promise<Card[]>((resolve) => setTimeout(() => resolve(loaded), ENRICH_TIMEOUT_MS)),
    ]);
    for (const set of batch) {
      const inSet = cards.filter((card) => card.set.id === set.id);
      const picks = inSet.flatMap((card) => {
        const price = getMarketPrice(card);
        return price?.currency === 'USD' ? [{ card, price: price.amount, change: null }] : [];
      });
      pricedAll.push(...picks);
      if (inSet.length > 0 && picks.length / inSet.length >= MIN_PRICED_SHARE && pricedSets.size < NEWEST_SETS) {
        pricedSets.add(set.id);
      }
    }
  }
  const priced = pricedAll.filter((pick) => pricedSets.has(pick.card.set.id));
  const sets = candidates.slice(0, NEWEST_SETS);
  const pricedNames = candidates.filter((set) => pricedSets.has(set.id)).map((set) => set.name);

  const store = await recordSnapshot(
    today,
    Object.fromEntries(pricedAll.filter((pick) => pick.price >= 1).map((pick) => [pick.card.id, pick.price])),
  );
  const comparison = compareSnapshots(store, today, RISING_WINDOW_DAYS);

  return {
    sets,
    pricedSetNames: pricedNames,
    chase: [...priced].sort((first, second) => second.price - first.price).slice(0, LIST_SIZE),
    sleepers: findSleepers(priced),
    rising: findRising(pricedAll, comparison?.changes ?? new Map()),
    risingSince: comparison?.from ?? null,
    trackedDays: Object.keys(store).length,
  };
}

function findSleepers(priced: DiscoverPick[]): DiscoverPick[] {
  const groups = new Map<string, DiscoverPick[]>();
  for (const pick of priced) {
    const rarity = pick.card.rarity ?? '';
    if (pick.card.supertype !== 'Pokémon' || !CHASE_RARITY.test(rarity)) continue;
    const key = `${pick.card.set.id}|${rarity}`;
    groups.set(key, [...(groups.get(key) ?? []), pick]);
  }

  const sleepers: DiscoverPick[] = [];
  for (const group of groups.values()) {
    if (group.length < 4) continue;
    const sorted = [...group].sort((first, second) => first.price - second.price);
    const median = sorted[Math.floor(sorted.length / 2)]?.price ?? 0;
    for (const pick of sorted) {
      const under = median > 0 ? 1 - pick.price / median : 0;
      if (pick.price >= SLEEPER_FLOOR && under >= SLEEPER_DISCOUNT) sleepers.push({ ...pick, change: -under });
    }
  }
  return sleepers.sort((first, second) => (first.change ?? 0) - (second.change ?? 0)).slice(0, LIST_SIZE);
}

function marketMomentum(card: Card): number | undefined {
  const prices = card.cardmarket?.prices;
  const recent = prices?.avg1 ?? prices?.trendPrice;
  const base = prices?.avg7 ?? prices?.avg30;
  if (!recent || !base || base <= 0) return undefined;
  return (recent - base) / base;
}

function findRising(priced: DiscoverPick[], changes: Map<string, number>): DiscoverPick[] {
  return priced
    .flatMap((pick) => {
      const change = changes.get(pick.card.id) ?? marketMomentum(pick.card);
      return change !== undefined && change >= RISING_MIN_CHANGE && pick.price >= RISING_FLOOR ? [{ ...pick, change }] : [];
    })
    .sort((first, second) => (second.change ?? 0) - (first.change ?? 0))
    .slice(0, LIST_SIZE);
}
