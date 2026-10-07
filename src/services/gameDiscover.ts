import type { Card } from '@/types/card';
import type { GameSet } from '@/types/gameSet';
import type { OtherGame } from '@/utils/game';
import { getMarketPrice } from '@/utils/price';

import { type CachePolicy, cachedFetch } from './cache';
import type { DiscoverPick } from './discover';
import { getGameSetCards, getGameSets } from './otherGames';
import { rememberCards } from './pokemonTcg';

const HOUR = 60 * 60 * 1000;
const DISCOVER_CACHE: CachePolicy = { bucket: 'game-discover', ttlMs: 6 * HOUR, maxEntries: 3 };
const PICKS = 12;
const NEW_SETS = 10;
const SOURCE_SETS = 2;

const MAIN_SET: Record<OtherGame, (set: GameSet) => boolean> = {
  mtg: (set) => ['Expansion', 'Core', 'Masters', 'Draft innovation'].includes(set.type ?? ''),
  yugioh: (set) => set.total >= 60,
  lorcana: (set) => set.type === 'Main set',
};

const HIGH_RARITY: Record<OtherGame, RegExp> = {
  mtg: /mythic|special|bonus/i,
  yugioh: /secret|ultra|starlight|ghost|quarter|collector|ultimate|platinum/i,
  lorcana: /legendary|enchanted|epic|iconic|super rare/i,
};

export type GameDiscover = {
  chase: DiscoverPick[];
  sleepers: DiscoverPick[];
  newSets: GameSet[];
  sourceSets: string[];
};

export async function loadGameDiscover(game: OtherGame, signal?: AbortSignal): Promise<GameDiscover> {
  const { value } = await cachedFetch(game, DISCOVER_CACHE, async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const sets = (await getGameSets(game, signal)).filter((set) => set.releaseDate && set.releaseDate <= today);
    const sources = sets.filter(MAIN_SET[game]).slice(0, SOURCE_SETS);
    const settled = await Promise.allSettled(sources.map((set) => getGameSetCards(set.id, signal)));
    const cards = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    const priced = cards.flatMap((card) => {
      const price = getMarketPrice(card);
      return price?.currency === 'USD' && price.amount > 0 ? [{ card, price: price.amount, change: null }] : [];
    });
    const chase = [...priced].sort((first, second) => second.price - first.price).slice(0, PICKS);
    const chaseIds = new Set(chase.map((pick) => pick.card.id));
    const sleepers = priced
      .filter((pick) => HIGH_RARITY[game].test(pick.card.rarity ?? '') && !chaseIds.has(pick.card.id))
      .sort((first, second) => first.price - second.price)
      .slice(0, PICKS);
    return {
      chase,
      sleepers,
      newSets: sets.slice(0, NEW_SETS),
      sourceSets: sources.map((set) => set.name),
    };
  });
  rememberCards([...value.chase, ...value.sleepers].map((pick): Card => pick.card));
  return value;
}
