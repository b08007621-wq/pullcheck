import type { Card } from '@/types/card';
import type { SetInfo } from '@/types/set';
import { parseDate } from '@/utils/date';
import { getMarketPrice } from '@/utils/price';

import { enrichCardPrices, productIdsForCards } from './cardPrices';
import { extraSets } from './extraCards';
import { getSetCards } from './pokemonTcg';
import { loadGroupHistory, weeklyChange } from './priceHistory';
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
const RISING_MIN_CHANGE = 0.02;
const HISTORY_SETS = 6;
const RISING_WINDOW_DAYS = 7;
const FRESH_MARKET_MS = 10 * 24 * 60 * 60 * 1000;

async function pickCandidates(signal?: AbortSignal): Promise<SetInfo[]> {
  const today = dayStamp();
  return [...(await loadSets(signal)), ...extraSets()]
    .filter((set) => set.total >= MIN_SET_SIZE && !SKIP_SET.test(set.name) && !SKIP_SERIES.test(set.series))
    .filter((set) => set.releaseDate.replace(/\//g, '-') <= today)
    .sort((first, second) => second.releaseDate.localeCompare(first.releaseDate))
    .slice(0, CANDIDATE_SETS);
}

export async function loadRisingExtra(signal?: AbortSignal): Promise<DiscoverPick[]> {
  const candidates = await pickCandidates(signal);
  const settled = await Promise.allSettled(candidates.slice(0, HISTORY_SETS).map((set) => getSetCards(set.id, signal)));
  const cards = await enrichCardPrices(settled.flatMap((result) => (result.status === 'fulfilled' ? result.value.value : [])));
  const picks: DiscoverPick[] = cards.flatMap((card) => {
    const price = getMarketPrice(card);
    return price?.currency === 'USD' ? [{ card, price: price.amount, change: null }] : [];
  });
  const changes = new Map<string, number>();
  try {
    const products = await productIdsForCards(picks.map((pick) => pick.card));
    const groups = new Set([...products.values()].map((entry) => entry.groupId));
    const files = new Map(
      (await Promise.allSettled([...groups].map(async (groupId) => [groupId, await loadGroupHistory('en', groupId)] as const)))
        .flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    );
    for (const [cardId, entry] of products) {
      const file = files.get(entry.groupId);
      const change = file ? weeklyChange(file, entry.productId) : null;
      if (change !== null) changes.set(cardId, change);
    }
  } catch {}
  return findRising(picks, changes);
}

export async function loadDiscover(signal?: AbortSignal): Promise<Discover> {
  const today = dayStamp();
  const candidates = await pickCandidates(signal);

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
  const updated = parseDate(card.cardmarket?.updatedAt);
  if (!prices || !updated || Date.now() - updated.getTime() > FRESH_MARKET_MS) return undefined;
  const recent = prices.avg1 ?? prices.trendPrice ?? prices.avg7;
  const bases = [prices.avg7, prices.avg30].filter((value): value is number => typeof value === 'number' && value > 0);
  if (!recent || bases.length === 0) return undefined;
  return Math.max(...bases.map((base) => (recent - base) / base));
}

export function findRising(priced: DiscoverPick[], changes: Map<string, number>): DiscoverPick[] {
  return priced
    .flatMap((pick) => {
      const change = changes.get(pick.card.id) ?? marketMomentum(pick.card);
      return change !== undefined && change >= RISING_MIN_CHANGE && pick.price >= RISING_FLOOR ? [{ ...pick, change }] : [];
    })
    .sort((first, second) => (second.change ?? 0) - (first.change ?? 0))
    .slice(0, LIST_SIZE);
}
